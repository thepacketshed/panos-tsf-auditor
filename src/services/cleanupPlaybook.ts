import { PanOsConfig, UnusedCleanupSummary, ManagementMode, ObjectLocation } from '../types/panos';

/**
 * Builds a cleanup remediation playbook that matches how the device is managed.
 *
 *  - standalone        → local PAN-OS CLI on the firewall
 *  - panorama-managed  → changes made on Panorama (device group / shared), then pushed
 *  - panorama          → TSF is from Panorama itself: per-location Panorama CLI + push
 *  - scm-managed       → changes made in Strata Cloud Manager (UI or Config API), then pushed
 */

export interface PlaybookOptions {
  /** Panorama device group that holds the firewall's policy (panorama-managed) */
  deviceGroup?: string;
  /** Put objects in Shared instead of the device group (panorama-managed) */
  objectsInShared?: boolean;
  /** SCM folder or snippet that holds the config (scm-managed) */
  scmScope?: string;
  /** Whether scmScope is a folder or a snippet */
  scmScopeType?: 'folder' | 'snippet';
}

export interface PlaybookStep {
  title: string;
  detail: string;
  commands?: string[];
}

export interface CleanupPlaybook {
  mode: ManagementMode;
  modeLabel: string;
  headline: string;
  summary: string;
  warnings: string[];
  steps: PlaybookStep[];
  scriptTitle: string;
  scriptLanguage: 'PAN-OS CLI' | 'Panorama CLI' | 'Bash (SCM Config API)';
  scriptFileExt: 'txt' | 'sh';
  script: string[];
  /** Short per-item hint shown next to each finding in the tables */
  itemAction: (kind: 'address' | 'address-group' | 'service' | 'rule', name: string, location?: ObjectLocation) => string;
}

export const MANAGEMENT_LABELS: Record<ManagementMode, string> = {
  standalone: 'Standalone firewall',
  'panorama-managed': 'Firewall managed by Panorama',
  panorama: 'Panorama (management server)',
  'scm-managed': 'Firewall managed by Strata Cloud Manager',
};

/** A rule can be shadowed by several earlier rules — only delete it once */
const uniqueShadowRules = (s: UnusedCleanupSummary) => Array.from(new Set(s.shadowRules.map((r) => r.ruleName)));

/** Numbered section headings that skip empty categories */
const sectionCounter = () => {
  let n = 0;
  return (title: string) => `# ${++n}. ${title}`;
};

const q = (name: string) => `"${name.replace(/"/g, '\\"')}"`;
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

/** Common caveats that apply whatever the management mode */
function commonWarnings(summary: UnusedCleanupSummary): string[] {
  const w = [
    'This analysis is a point-in-time view of one configuration file. Confirm zero hit counts over a representative period (typically 90+ days) before removing rules.',
    'PAN-OS refuses to delete an object that is still referenced anywhere, so validation will catch anything this report missed — treat a validation error as "keep it".',
  ];
  if (summary.shadowRules.length > 0) {
    w.push('Shadow detection compares rule match criteria only. Rules can differ in ways it does not model (users, URL categories, schedules, HIP), so review each one before deleting.');
  }
  return w;
}

// ---------------------------------------------------------------------------
// Standalone firewall
// ---------------------------------------------------------------------------
function standalonePlaybook(config: PanOsConfig, s: UnusedCleanupSummary): CleanupPlaybook {
  const vsysList = config.metadata.vsysList || ['vsys1'];
  const multiVsys = vsysList.length > 1;
  const backup = `pre-cleanup-${today()}.xml`;

  const script: string[] = [
    '# =========================================================',
    '# PAN-OS CLI Cleanup Script — STANDALONE FIREWALL',
    `# Generated for: ${config.metadata.hostname} (${config.metadata.model}, PAN-OS ${config.metadata.panOsVersion})`,
    '# Review every line before running. Run in a change window.',
    '# =========================================================',
    '',
    '# Step 1 (operational mode): confirm the rules below have zero hits',
    ...vsysList.map((v) => `show rule-hit-count vsys vsys-name ${v} rule-base security rules all`),
    '',
  ];

  // Group by vsys for multi-vsys boxes
  const byVsys = new Map<string, string[]>();
  const add = (vsys: string | undefined, line: string) => {
    const key = multiVsys ? vsys || vsysList[0] : '_';
    if (!byVsys.has(key)) byVsys.set(key, []);
    byVsys.get(key)!.push(line);
  };
  const ruleVsys = (name: string) => config.securityRules.find((r) => r.name === name)?.vsys;
  const objVsys = (loc?: ObjectLocation) => (loc?.scope === 'vsys' ? loc.name : undefined);

  uniqueShadowRules(s).forEach((name) => add(ruleVsys(name), `delete rulebase security rules ${q(name)}`));
  s.unusedAddressGroups.forEach((g) => add(objVsys(g.location), `delete address-group ${q(g.name)}`));
  s.unusedAddressObjects.forEach((a) => add(objVsys(a.location), `delete address ${q(a.name)}`));
  s.unusedServiceObjects.forEach((v) => add(objVsys(v.location), `delete service ${q(v.name)}`));

  if (byVsys.size === 0) {
    script.push('# No unused objects or shadowed rules found — nothing to delete.');
  } else {
    if (!multiVsys) {
      script.push('configure');
      script.push(`save config to ${backup}`);
      script.push('# Order matters: rules first, then groups, then the objects they contained');
      script.push(...(byVsys.get('_') || []));
      script.push('validate full');
      script.push('commit description "Hygiene cleanup: unused objects and shadowed rules"');
      script.push('exit');
    } else {
      script.push('configure');
      script.push(`save config to ${backup}`);
      script.push('exit');
      script.push('');
      byVsys.forEach((lines, vsys) => {
        script.push(`# --- ${vsys} ---`);
        script.push(`set system setting target-vsys ${vsys}`);
        script.push('configure');
        script.push('# Order matters: rules first, then groups, then the objects they contained');
        script.push(...lines);
        script.push('exit');
        script.push('');
      });
      script.push('set system setting target-vsys none');
      script.push('configure');
      script.push('validate full');
      script.push('commit description "Hygiene cleanup: unused objects and shadowed rules"');
      script.push('exit');
    }
  }

  return {
    mode: 'standalone',
    modeLabel: MANAGEMENT_LABELS.standalone,
    headline: 'Remediate directly on the firewall',
    summary: 'This firewall holds its own configuration, so cleanup is done locally in configure mode and committed on the box.',
    warnings: [
      ...commonWarnings(s),
      ...(multiVsys ? ['Multi-vsys firewall: commands are grouped per vsys using "set system setting target-vsys". Shared objects are deleted from the shared context.'] : []),
      'If this firewall is in an HA pair, make the change on the active peer and confirm config sync afterwards.',
    ],
    steps: [
      {
        title: 'Back up the running configuration',
        detail: 'Save a named copy you can load back if anything goes wrong. Also export it off-box (Device → Setup → Operations → Export named configuration snapshot).',
        commands: ['configure', `save config to ${backup}`],
      },
      {
        title: 'Confirm rules really have zero hits',
        detail: 'Check hit counts (and "Last Hit" / "Rule Usage") in Policies → Security. Only remove shadowed rules with no hits over your review period.',
        commands: vsysList.map((v) => `show rule-hit-count vsys vsys-name ${v} rule-base security rules all`),
      },
      {
        title: 'Delete in dependency order',
        detail: 'Remove shadowed rules first, then unused address groups, then address and service objects. The full script below follows this order.',
      },
      {
        title: 'Validate, commit and verify',
        detail: 'Run "validate full" before committing. After the commit, check the System log and confirm traffic and hit counts look normal.',
        commands: ['validate full', 'commit description "Hygiene cleanup"'],
      },
    ],
    scriptTitle: 'PAN-OS CLI cleanup script (run on the firewall)',
    scriptLanguage: 'PAN-OS CLI',
    scriptFileExt: 'txt',
    script,
    itemAction: (kind, name) => {
      switch (kind) {
        case 'rule': return `delete rulebase security rules ${q(name)}`;
        case 'address-group': return `delete address-group ${q(name)}`;
        case 'service': return `delete service ${q(name)}`;
        default: return `delete address ${q(name)}`;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Panorama: shared helpers for building device-group / shared paths
// ---------------------------------------------------------------------------
function panoramaObjectPath(kind: 'address' | 'address-group' | 'service', name: string, loc: ObjectLocation | undefined, fallbackDg: string, preferShared: boolean): string {
  if (loc?.scope === 'shared' || (!loc?.name && preferShared)) return `delete shared ${kind} ${q(name)}`;
  const dg = loc?.scope === 'device-group' && loc.name ? loc.name : fallbackDg;
  return `delete device-group ${q(dg)} ${kind} ${q(name)}`;
}

function panoramaRulePath(name: string, dg: string, rulebase: 'pre' | 'post' | 'local' | undefined, isSharedRule: boolean): string {
  const rb = rulebase === 'post' ? 'post-rulebase' : 'pre-rulebase';
  return isSharedRule
    ? `delete shared ${rb} security rules ${q(name)}`
    : `delete device-group ${q(dg)} ${rb} security rules ${q(name)}`;
}

function panoramaSteps(dgList: string[], backup: string): PlaybookStep[] {
  const dgs = dgList.length ? dgList : ['<DEVICE-GROUP>'];
  return [
    {
      title: 'Back up the Panorama configuration',
      detail: 'Save a named snapshot on Panorama (and export it off-box) before touching shared or device-group config.',
      commands: ['configure', `save config to ${backup}`],
    },
    {
      title: 'Confirm where each item lives and who uses it',
      detail: 'In Panorama, check the Location column for each object and rule. Shared objects and parent device groups are inherited by every child device group — an object that looks unused on this firewall may still be used by other firewalls, so check usage across all device groups before deleting.',
    },
    {
      title: 'Confirm zero hits across all managed firewalls',
      detail: 'In Policies → Security (Pre/Post Rules), use the Rule Usage / Hit Count columns, which Panorama aggregates from every firewall in the device group. Only remove rules with no hits on any member firewall over your review period.',
    },
    {
      title: 'Delete on Panorama, then commit',
      detail: 'Make the changes in the Panorama device group (or Shared) — not on the firewall. Delete rules first, then groups, then objects. Run "validate full", then commit to Panorama.',
      commands: ['validate full', 'commit description "Hygiene cleanup"'],
    },
    {
      title: 'Push to the managed firewalls',
      detail: 'Push the device group(s) to the firewalls (Commit → Push to Devices, or the CLI below). Review the push preview / config diff first, then check the push job and each firewall\'s commit status.',
      commands: dgs.map((dg) => `commit-all shared-policy device-group ${q(dg)}`),
    },
  ];
}

// ---------------------------------------------------------------------------
// Firewall managed by Panorama
// ---------------------------------------------------------------------------
function panoramaManagedPlaybook(config: PanOsConfig, s: UnusedCleanupSummary, opts: PlaybookOptions): CleanupPlaybook {
  const dg = (opts.deviceGroup || config.metadata.deviceGroups?.[0] || '<DEVICE-GROUP>').trim() || '<DEVICE-GROUP>';
  const preferShared = Boolean(opts.objectsInShared);
  const backup = `pre-cleanup-${today()}.xml`;
  const servers = config.metadata.management?.panoramaServers;

  const ruleLine = (name: string) => {
    const r = config.securityRules.find((x) => x.name === name);
    const rb = r?.rulebase === 'post' ? 'post' : r?.rulebase === 'pre' ? 'pre' : undefined;
    const line = panoramaRulePath(name, r?.deviceGroup || dg, rb, false);
    return rb ? line : `${line}   # verify: pre-rulebase or post-rulebase`;
  };

  const script: string[] = [
    '# =========================================================',
    '# Panorama CLI Cleanup Script — FIREWALL MANAGED BY PANORAMA',
    `# Firewall: ${config.metadata.hostname} (${config.metadata.model}, PAN-OS ${config.metadata.panOsVersion})`,
    `# Run on Panorama${servers?.length ? ` (${servers.join(' / ')})` : ''}, NOT on the firewall.`,
    `# Device group: ${dg}${preferShared ? '   |   Objects assumed in: Shared' : ''}`,
    '# Review every line — objects may be inherited from Shared or a parent device group.',
    '# =========================================================',
    'configure',
    `save config to ${backup}`,
    '',
  ];
  const sec = sectionCounter();
  if (s.shadowRules.length) {
    script.push(sec('Shadowed / redundant rules'));
    uniqueShadowRules(s).forEach((name) => script.push(ruleLine(name)));
    script.push('');
  }
  if (s.unusedAddressGroups.length) {
    script.push(sec('Unused address groups'));
    s.unusedAddressGroups.forEach((g) => script.push(panoramaObjectPath('address-group', g.name, g.location?.scope === 'local' || g.location?.scope === 'vsys' ? undefined : g.location, dg, preferShared)));
    script.push('');
  }
  if (s.unusedAddressObjects.length) {
    script.push(sec('Unused address objects'));
    s.unusedAddressObjects.forEach((a) => script.push(panoramaObjectPath('address', a.name, a.location?.scope === 'local' || a.location?.scope === 'vsys' ? undefined : a.location, dg, preferShared)));
    script.push('');
  }
  if (s.unusedServiceObjects.length) {
    script.push(sec('Unused service objects'));
    s.unusedServiceObjects.forEach((v) => script.push(panoramaObjectPath('service', v.name, v.location?.scope === 'local' || v.location?.scope === 'vsys' ? undefined : v.location, dg, preferShared)));
    script.push('');
  }
  script.push('validate full');
  script.push('commit description "Hygiene cleanup: unused objects and shadowed rules"');
  script.push('exit');
  script.push('');
  script.push('# Push the device group to its firewalls (operational mode on Panorama)');
  script.push(`commit-all shared-policy device-group ${q(dg)}`);
  script.push('show jobs all');

  return {
    mode: 'panorama-managed',
    modeLabel: MANAGEMENT_LABELS['panorama-managed'],
    headline: 'Remediate on Panorama, then push',
    summary: `This firewall takes its policy and objects from Panorama. Anything pushed from Panorama is read-only on the firewall and would come back on the next push, so the cleanup is done in the Panorama device group${preferShared ? ' and Shared' : ''} and then pushed.`,
    warnings: [
      ...commonWarnings(s),
      'This TSF shows one firewall. Objects in Shared or a parent device group may be used by other firewalls — check usage across every device group before deleting.',
      'Objects created locally on the firewall (not pushed from Panorama) can be removed on the firewall itself; consider moving any you keep into Panorama so there is one source of truth.',
      ...(dg === '<DEVICE-GROUP>' ? ['Enter the device group name above so the commands are ready to paste.'] : []),
    ],
    steps: panoramaSteps([dg], backup),
    scriptTitle: 'Panorama CLI cleanup script (run on Panorama)',
    scriptLanguage: 'Panorama CLI',
    scriptFileExt: 'txt',
    script,
    itemAction: (kind, name, loc) => {
      if (kind === 'rule') return ruleLine(name).replace(/\s+#.*$/, '');
      const l = loc?.scope === 'local' || loc?.scope === 'vsys' ? undefined : loc;
      return panoramaObjectPath(kind, name, l, dg, preferShared);
    },
  };
}

// ---------------------------------------------------------------------------
// TSF taken from Panorama itself
// ---------------------------------------------------------------------------
function panoramaPlaybook(config: PanOsConfig, s: UnusedCleanupSummary, opts: PlaybookOptions): CleanupPlaybook {
  const fallbackDg = (opts.deviceGroup || config.metadata.deviceGroups?.[0] || '<DEVICE-GROUP>').trim() || '<DEVICE-GROUP>';
  const backup = `pre-cleanup-${today()}.xml`;
  const touchedDgs = new Set<string>();

  const ruleLine = (name: string) => {
    const r = config.securityRules.find((x) => x.name === name);
    const dg = r?.deviceGroup || fallbackDg;
    const isShared = r?.location?.scope === 'shared';
    if (!isShared) touchedDgs.add(dg);
    const rb = r?.rulebase === 'post' ? 'post' : 'pre';
    return panoramaRulePath(name, dg, rb, isShared);
  };
  const objLine = (kind: 'address' | 'address-group' | 'service', name: string, loc?: ObjectLocation) => {
    if (loc?.scope === 'device-group' && loc.name) touchedDgs.add(loc.name);
    else if (loc?.scope !== 'shared') touchedDgs.add(fallbackDg);
    return panoramaObjectPath(kind, name, loc, fallbackDg, false);
  };

  const body: string[] = [];
  const sec = sectionCounter();
  if (s.shadowRules.length) {
    body.push(sec('Shadowed / redundant rules'));
    uniqueShadowRules(s).forEach((name) => body.push(ruleLine(name)));
    body.push('');
  }
  if (s.unusedAddressGroups.length) {
    body.push(sec('Unused address groups'));
    s.unusedAddressGroups.forEach((g) => body.push(objLine('address-group', g.name, g.location)));
    body.push('');
  }
  if (s.unusedAddressObjects.length) {
    body.push(sec('Unused address objects'));
    s.unusedAddressObjects.forEach((a) => body.push(objLine('address', a.name, a.location)));
    body.push('');
  }
  if (s.unusedServiceObjects.length) {
    body.push(sec('Unused service objects'));
    s.unusedServiceObjects.forEach((v) => body.push(objLine('service', v.name, v.location)));
    body.push('');
  }
  const anyShared = [...s.unusedAddressGroups, ...s.unusedAddressObjects, ...s.unusedServiceObjects].some((o) => o.location?.scope === 'shared');
  const dgs = touchedDgs.size ? Array.from(touchedDgs) : config.metadata.deviceGroups?.length ? config.metadata.deviceGroups : [fallbackDg];

  const script: string[] = [
    '# =========================================================',
    '# Panorama CLI Cleanup Script — PANORAMA',
    `# Panorama: ${config.metadata.hostname} (${config.metadata.model}, ${config.metadata.panOsVersion})`,
    '# Each line targets the location (Shared / device group) the item is defined in.',
    '# =========================================================',
    'configure',
    `save config to ${backup}`,
    '',
    ...body,
    'validate full',
    'commit description "Hygiene cleanup: unused objects and shadowed rules"',
    'exit',
    '',
    `# Push affected device groups${anyShared ? ' (Shared changes reach every device group — push all that inherit them)' : ''}`,
    ...dgs.map((dg) => `commit-all shared-policy device-group ${q(dg)}`),
    'show jobs all',
  ];

  return {
    mode: 'panorama',
    modeLabel: MANAGEMENT_LABELS.panorama,
    headline: 'Remediate in each device group or Shared, then push',
    summary: 'This TSF is from Panorama, so it includes every device group and Shared. Each command targets the location where the object or rule is defined, followed by a push to the affected device groups.',
    warnings: [
      ...commonWarnings(s),
      'Objects in Shared are inherited by every device group, and parent device groups pass objects to their children. An object is only safe to delete when no device group below it uses it.',
      'Template / template-stack settings are not part of this cleanup — it covers policy and objects only.',
    ],
    steps: panoramaSteps(dgs, backup),
    scriptTitle: 'Panorama CLI cleanup script (run on Panorama)',
    scriptLanguage: 'Panorama CLI',
    scriptFileExt: 'txt',
    script,
    itemAction: (kind, name, loc) => (kind === 'rule' ? ruleLine(name) : objLine(kind, name, loc)),
  };
}

// ---------------------------------------------------------------------------
// Firewall managed by Strata Cloud Manager
// ---------------------------------------------------------------------------
function scmPlaybook(config: PanOsConfig, s: UnusedCleanupSummary, opts: PlaybookOptions): CleanupPlaybook {
  const scopeType = opts.scmScopeType || 'folder';
  const scope = (opts.scmScope || '').trim() || (scopeType === 'folder' ? '<FOLDER>' : '<SNIPPET>');
  const shq = (v: string) => `'${v.replace(/'/g, `'\\''`)}'`;

  const script: string[] = [
    '#!/usr/bin/env bash',
    '# =========================================================',
    '# Strata Cloud Manager cleanup — Config API (optional, for bulk changes)',
    `# Firewall: ${config.metadata.hostname} (${config.metadata.model}, PAN-OS ${config.metadata.panOsVersion})`,
    `# Scope: ${scopeType} ${scope}`,
    '# Requires: curl, jq, and an SCM service account with config permissions.',
    '# DRY RUN by default — set APPLY=1 to actually delete. Nothing is pushed',
    '# until you run the push at the end (or push from the SCM UI).',
    '# Check endpoints against the current SCM API reference on pan.dev.',
    '# =========================================================',
    'set -euo pipefail',
    ': "${CLIENT_ID:?set CLIENT_ID}" "${CLIENT_SECRET:?set CLIENT_SECRET}" "${TSG_ID:?set TSG_ID}"',
    'API="https://api.strata.paloaltonetworks.com"',
    `SCOPE_TYPE=${shq(scopeType)}`,
    `SCOPE=${shq(scope)}`,
    'APPLY="${APPLY:-0}"',
    '',
    'TOKEN=$(curl -s -u "$CLIENT_ID:$CLIENT_SECRET" \\',
    '  -d "grant_type=client_credentials&scope=tsg_id:$TSG_ID" \\',
    '  "https://auth.apps.paloaltonetworks.com/oauth2/access_token" | jq -r .access_token)',
    '',
    '# delete_item <api-path> <name> [extra query, e.g. position=pre]',
    'delete_item() {',
    '  local path="$1" name="$2" extra="${3:-}"',
    '  local id',
    '  id=$(curl -s -G -H "Authorization: Bearer $TOKEN" "$API$path" \\',
    '        --data-urlencode "$SCOPE_TYPE=$SCOPE" --data-urlencode "name=$name" \\',
    '        ${extra:+--data-urlencode "$extra"} | jq -r \'.data[0].id // empty\')',
    '  if [ -z "$id" ]; then echo "SKIP  $name (not found in $SCOPE_TYPE $SCOPE)"; return; fi',
    '  if [ "$APPLY" = "1" ]; then',
    '    curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$API$path/$id" >/dev/null && echo "DELETED $name"',
    '  else',
    '    echo "WOULD DELETE $name ($id)"',
    '  fi',
    '}',
    '',
  ];
  const sec = sectionCounter();
  if (s.shadowRules.length) {
    script.push(sec('Shadowed / redundant rules (confirm with Policy Analyzer first)'));
    uniqueShadowRules(s).forEach((name) => {
      const rule = config.securityRules.find((x) => x.name === name);
      const pos = rule?.rulebase === 'post' ? 'post' : 'pre';
      script.push(`delete_item /config/security/v1/security-rules ${shq(name)} position=${pos}`);
    });
    script.push('');
  }
  if (s.unusedAddressGroups.length) {
    script.push(sec('Unused address groups'));
    s.unusedAddressGroups.forEach((g) => script.push(`delete_item /config/objects/v1/address-groups ${shq(g.name)}`));
    script.push('');
  }
  if (s.unusedAddressObjects.length) {
    script.push(sec('Unused address objects'));
    s.unusedAddressObjects.forEach((a) => script.push(`delete_item /config/objects/v1/addresses ${shq(a.name)}`));
    script.push('');
  }
  if (s.unusedServiceObjects.length) {
    script.push(sec('Unused service objects'));
    s.unusedServiceObjects.forEach((v) => script.push(`delete_item /config/objects/v1/services ${shq(v.name)}`));
    script.push('');
  }
  script.push(sec('Push the candidate config (or use Push Config in the SCM UI and review the diff there)'));
  script.push('if [ "$APPLY" = "1" ]; then');
  script.push(`  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\`);
  script.push(`    -d ${shq(JSON.stringify({ folders: [scopeType === 'folder' ? scope : '<FOLDER-THAT-USES-THIS-SNIPPET>'] }))} \\`);
  script.push('    "$API/config/operations/v1/config-versions/candidate:push" | jq .');
  script.push('fi');

  return {
    mode: 'scm-managed',
    modeLabel: MANAGEMENT_LABELS['scm-managed'],
    headline: 'Remediate in Strata Cloud Manager, then push',
    summary: 'Strata Cloud Manager is the source of truth for this firewall. Changes made on the firewall CLI would be overwritten on the next push, so the cleanup is done in SCM — in the folder or snippet where each item is defined — and then pushed.',
    warnings: [
      ...commonWarnings(s),
      'In SCM, configuration is inherited down the folder tree (Global → folders → devices) and through snippets. An item may be defined higher up than this firewall and shared with other firewalls or Prisma Access — check where it lives and who else uses it.',
      'Do not make these changes on the firewall CLI: local edits drift from SCM and are replaced on the next push.',
      ...(scope.startsWith('<') ? [`Enter the SCM ${scopeType} name above so the steps and script point at the right scope.`] : []),
    ],
    steps: [
      {
        title: 'Snapshot the current configuration',
        detail: 'In SCM, note the current running config version (Manage → Configuration → Operations / Config Versions) so you can compare or roll back.',
      },
      {
        title: `Open the right scope (${scopeType}: ${scope})`,
        detail: 'Go to Manage → Configuration → NGFW and Prisma Access and set the configuration scope to the folder or snippet where each object or rule is defined. Inherited items show their source location — edit them there, not in a child folder.',
      },
      {
        title: 'Confirm the findings with SCM tools',
        detail: 'Use Policy Analyzer to confirm shadowed or redundant rules, and check rule usage / hit counts for the firewall. If you have AIOps for NGFW, its Config Cleanup view lists unused objects and zero-hit rules to cross-check against this report.',
      },
      {
        title: 'Delete in dependency order',
        detail: 'In Security Services → Security Policy, remove shadowed rules first. Then in Objects, remove unused address groups, address objects and service objects. SCM blocks deleting anything still referenced. For many items, use the Config API script below (dry run by default).',
      },
      {
        title: 'Push and verify',
        detail: 'Use Push Config, review the config diff for the target devices, and push. Check the push job status, then confirm on the firewall that traffic and hit counts look normal.',
      },
    ],
    scriptTitle: 'SCM Config API script (optional bulk cleanup, dry run by default)',
    scriptLanguage: 'Bash (SCM Config API)',
    scriptFileExt: 'sh',
    script,
    itemAction: (kind, name) => {
      const where = `${scopeType} "${scope}"`;
      switch (kind) {
        case 'rule': return `SCM → Security Policy (${where}) → delete "${name}"`;
        case 'address-group': return `SCM → Objects → Address Groups (${where}) → delete`;
        case 'service': return `SCM → Objects → Services (${where}) → delete`;
        default: return `SCM → Objects → Addresses (${where}) → delete`;
      }
    },
  };
}

export function buildCleanupPlaybook(
  config: PanOsConfig,
  summary: UnusedCleanupSummary,
  mode: ManagementMode,
  opts: PlaybookOptions = {}
): CleanupPlaybook {
  switch (mode) {
    case 'panorama-managed': return panoramaManagedPlaybook(config, summary, opts);
    case 'panorama': return panoramaPlaybook(config, summary, opts);
    case 'scm-managed': return scmPlaybook(config, summary, opts);
    default: return standalonePlaybook(config, summary);
  }
}

/** Management mode to use when nothing has been chosen by the user */
export function defaultManagementMode(config: PanOsConfig): ManagementMode {
  if (config.metadata.management?.mode) return config.metadata.management.mode;
  if (config.metadata.isPanorama) return 'panorama';
  if (config.hardening.panoramaForwardingConfigured) return 'panorama-managed';
  return 'standalone';
}
