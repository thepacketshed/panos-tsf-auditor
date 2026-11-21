import { PanOsConfig, UnusedCleanupSummary, AddressObject, AddressGroupObject, ServiceObject } from '../types/panos';

export function evaluateCleanupAndHygiene(config: PanOsConfig): UnusedCleanupSummary {
  const { addressObjects, addressGroups, serviceObjects, securityRules, natRules, decryptionRules } = config;

  // 1. Gather all referenced object names across security, NAT, decryption rules and groups
  const referencedAddresses = new Set<string>();
  const referencedGroups = new Set<string>();
  const referencedServices = new Set<string>();

  // Helper to add from string arrays
  const scanArray = (arr: string[]) => {
    arr.forEach((item) => {
      if (item !== 'any') {
        referencedAddresses.add(item);
        referencedGroups.add(item);
      }
    });
  };

  // Scan Security Rules
  securityRules.forEach((rule) => {
    scanArray(rule.sources);
    scanArray(rule.destinations);
    rule.services.forEach((s) => {
      if (s !== 'any' && s !== 'application-default') {
        referencedServices.add(s);
      }
    });
  });

  // Scan NAT Rules
  natRules.forEach((nat) => {
    scanArray(nat.source);
    scanArray(nat.destination);
    if (nat.service !== 'any') referencedServices.add(nat.service);
  });

  // Scan Decryption Rules
  decryptionRules.forEach((dec) => {
    scanArray(dec.sources);
    scanArray(dec.destinations);
  });

  // Any name referenced elsewhere in the full config (NAT, PBF, QoS, decryption,
  // GlobalProtect, etc.) counts as used, so nothing is wrongly flagged for deletion.
  (config.referencedNames || []).forEach((n) => {
    referencedAddresses.add(n);
    referencedGroups.add(n);
    referencedServices.add(n);
  });

  // Scan Address Groups: if a group is used, its members are also marked used
  addressGroups.forEach((grp) => {
    grp.members.forEach((m) => {
      referencedAddresses.add(m);
    });
  });

  // Check which address objects are unused
  const unusedAddressObjects: AddressObject[] = addressObjects.map((obj) => {
    const isUsed = referencedAddresses.has(obj.name);
    return {
      ...obj,
      isUsed,
    };
  }).filter((obj) => !obj.isUsed);

  // Check which address groups are unused
  const unusedAddressGroups: AddressGroupObject[] = addressGroups.map((grp) => {
    const isUsed = referencedGroups.has(grp.name);
    return {
      ...grp,
      isUsed,
    };
  }).filter((grp) => !grp.isUsed);

  // Check which service objects are unused
  const unusedServiceObjects: ServiceObject[] = serviceObjects.map((srv) => {
    const isUsed = referencedServices.has(srv.name);
    return {
      ...srv,
      isUsed,
    };
  }).filter((srv) => !srv.isUsed);

  // 2. Identify Shadow / Redundant Rules
  const shadowRules: { ruleName: string; shadowedByRule: string; reason: string }[] = [];
  for (let i = 0; i < securityRules.length; i++) {
    const rA = securityRules[i];
    if (rA.disabled) continue;

    for (let j = i + 1; j < securityRules.length; j++) {
      const rB = securityRules[j];
      if (rB.disabled) continue;

      // Check if rA encompasses rB
      const zonesMatch =
        (rA.fromZones.includes('any') || rB.fromZones.every((z) => rA.fromZones.includes(z))) &&
        (rA.toZones.includes('any') || rB.toZones.every((z) => rA.toZones.includes(z)));

      const sourceMatch = rA.sources.includes('any') || rB.sources.every((s) => rA.sources.includes(s));
      const destMatch = rA.destinations.includes('any') || rB.destinations.every((d) => rA.destinations.includes(d));
      const appMatch = rA.applications.includes('any') || rB.applications.every((a) => rA.applications.includes(a));
      const serviceMatch = rA.services.includes('any') || rB.services.every((s) => rA.services.includes(s));

      if (zonesMatch && sourceMatch && destMatch && appMatch && serviceMatch && rA.action === rB.action) {
        shadowRules.push({
          ruleName: rB.name,
          shadowedByRule: rA.name,
          reason: `Rule "${rA.name}" is positioned higher in evaluation order and matches all or broader traffic parameters than "${rB.name}". Rule "${rB.name}" will receive zero hits.`,
        });
      }
    }
  }

  // 3. Overly Permissive Policies
  const overlyPermissiveRules: { ruleName: string; reason: string; risk: 'High' | 'Medium' }[] = [];
  securityRules.forEach((r) => {
    if (r.disabled || r.action !== 'allow') return;

    if (r.sources.includes('any') && r.destinations.includes('any') && r.applications.includes('any') && r.services.includes('any')) {
      overlyPermissiveRules.push({
        ruleName: r.name,
        reason: 'Permits ANY source to ANY destination with ANY application on ANY service port without restriction.',
        risk: 'High',
      });
    } else if (r.applications.includes('any') && r.services.includes('any')) {
      overlyPermissiveRules.push({
        ruleName: r.name,
        reason: 'Permits ANY application and ANY service port between specified zones/IPs.',
        risk: 'High',
      });
    } else if (r.services.includes('any')) {
      overlyPermissiveRules.push({
        ruleName: r.name,
        reason: 'Allows traffic on arbitrary TCP/UDP ports bypassing standard application port mapping.',
        risk: 'Medium',
      });
    } else if (!r.logEnd) {
      overlyPermissiveRules.push({
        ruleName: r.name,
        reason: 'Permits traffic without recording session logs ("log-end: false"). Audit trail blind spot.',
        risk: 'Medium',
      });
    }
  });

  // 4. Generate CLI remediation commands
  const cleanupCliCommands: string[] = [];
  cleanupCliCommands.push('# =========================================================');
  cleanupCliCommands.push('# PAN-OS CLI Remediation & Hygiene Cleanup Script');
  cleanupCliCommands.push(`# Generated for: ${config.metadata.hostname} (${config.metadata.model})`);
  cleanupCliCommands.push('# =========================================================');
  cleanupCliCommands.push('configure');
  cleanupCliCommands.push('');

  if (shadowRules.length > 0) {
    cleanupCliCommands.push('# 1. Remove Shadowed / Redundant Security Rules');
    shadowRules.forEach((s) => {
      cleanupCliCommands.push(`delete rulebase security rules "${s.ruleName}"`);
    });
    cleanupCliCommands.push('');
  }

  if (unusedAddressGroups.length > 0) {
    cleanupCliCommands.push('# 2. Remove Unused Address Groups');
    unusedAddressGroups.forEach((g) => {
      cleanupCliCommands.push(`delete address-group "${g.name}"`);
    });
    cleanupCliCommands.push('');
  }

  if (unusedAddressObjects.length > 0) {
    cleanupCliCommands.push('# 3. Remove Unused Address Objects');
    unusedAddressObjects.forEach((a) => {
      cleanupCliCommands.push(`delete address "${a.name}"`);
    });
    cleanupCliCommands.push('');
  }

  if (unusedServiceObjects.length > 0) {
    cleanupCliCommands.push('# 4. Remove Unused Service Objects');
    unusedServiceObjects.forEach((s) => {
      cleanupCliCommands.push(`delete service "${s.name}"`);
    });
    cleanupCliCommands.push('');
  }

  cleanupCliCommands.push('# 5. Validate & Commit Clean Configuration');
  cleanupCliCommands.push('validate full');
  cleanupCliCommands.push('commit description "Automated hygiene cleanup of orphaned objects and shadow rules"');
  cleanupCliCommands.push('exit');

  return {
    totalAddressObjects: addressObjects.length,
    unusedAddressObjects,
    totalServiceObjects: serviceObjects.length,
    unusedServiceObjects,
    totalAddressGroups: addressGroups.length,
    unusedAddressGroups,
    shadowRules,
    overlyPermissiveRules,
    cleanupCliCommands,
  };
}
