import { PanOsConfig, NistControlEvaluation } from '../types/panos';

export function evaluateNistControls(config: PanOsConfig): {
  evaluations: NistControlEvaluation[];
  compliancePercentage: number;
  passedCount: number;
  failedCount: number;
  warnCount: number;
} {
  const evaluations: NistControlEvaluation[] = [];

  const { securityRules, hardening, decryptionRules } = config;

  // 1. AC-3: Access Enforcement
  const anyAnyRules = securityRules.filter(
    (r) => !r.disabled &&
      r.action === 'allow' &&
      r.sources.includes('any') &&
      r.destinations.includes('any') &&
      r.applications.includes('any') &&
      r.services.includes('any')
  );

  if (anyAnyRules.length > 0) {
    evaluations.push({
      id: 'AC-3',
      family: 'Access Control',
      title: 'Access Enforcement (Least Privilege Boundaries)',
      status: 'FAIL',
      score: 0,
      requirement: 'Enforce approved authorizations for logical access to information and system resources in accordance with applicable access control policies.',
      finding: `Found ${anyAnyRules.length} overly permissive rule(s) permitting ANY source, destination, application, and service without restriction.`,
      evidence: anyAnyRules.map((r) => `Rule "${r.name}": From [${r.fromZones.join(',')}] to [${r.toZones.join(',')}] allows ANY-ANY`),
      recommendation: 'Decommission or restrict wide permit policies. Restrict rules to defined IP objects, validated App-IDs, and service ports.',
    });
  } else {
    evaluations.push({
      id: 'AC-3',
      family: 'Access Control',
      title: 'Access Enforcement (Least Privilege Boundaries)',
      status: 'PASS',
      score: 100,
      requirement: 'Enforce approved authorizations for logical access to information and system resources in accordance with applicable access control policies.',
      finding: 'All active security policies define explicit source, destination, or zone boundaries. No blanket any-any permit rules identified.',
      evidence: [`Verified ${securityRules.length} security rules have bounded scopes.`],
      recommendation: 'Maintain policy change approval workflows and quarterly rule reviews.',
    });
  }

  // 2. AC-4: Information Flow Enforcement (App-ID vs Port-based)
  const allowRules = securityRules.filter((r) => !r.disabled && r.action === 'allow');
  const serviceAnyRules = allowRules.filter((r) => r.services.includes('any'));
  const appAnyRules = allowRules.filter((r) => r.applications.includes('any'));

  if (serviceAnyRules.length > 0 || appAnyRules.length > 0) {
    const isFail = serviceAnyRules.length > 1;
    evaluations.push({
      id: 'AC-4',
      family: 'Access Control',
      title: 'Information Flow Enforcement (App-ID & Service Port Control)',
      status: isFail ? 'FAIL' : 'WARN',
      score: isFail ? 30 : 65,
      requirement: 'Enforce approved authorizations for controlling the flow of information within the system and between connected systems using application-layer inspection.',
      finding: `${serviceAnyRules.length} allow rule(s) use 'service: any' and ${appAnyRules.length} allow rule(s) use 'application: any'. Traffic can bypass standard port-protocol mappings.`,
      evidence: [
        ...serviceAnyRules.slice(0, 3).map((r) => `Rule "${r.name}" allows service: any`),
        ...appAnyRules.slice(0, 3).map((r) => `Rule "${r.name}" allows application: any`),
      ],
      recommendation: 'Transition policies to App-ID with "application-default" services to prevent non-standard port encapsulation and tunneling.',
    });
  } else {
    evaluations.push({
      id: 'AC-4',
      family: 'Access Control',
      title: 'Information Flow Enforcement (App-ID & Service Port Control)',
      status: 'PASS',
      score: 100,
      requirement: 'Enforce approved authorizations for controlling the flow of information using application-layer inspection.',
      finding: 'All allow policies enforce specific App-IDs with application-default or explicit service port constraints.',
      evidence: [`All ${allowRules.length} permit rules utilize application-layer validation.`],
      recommendation: 'Enable Policy Optimizer in PAN-OS to continuously refine application definitions.',
    });
  }

  // 3. SC-7: Boundary Protection (Management Plane Isolation)
  const mgmtOpen = hardening.permittedIpList.length === 0;
  const telnetActive = hardening.services.telnet;
  const httpActive = hardening.services.http;

  if (mgmtOpen || telnetActive || httpActive) {
    const reasons: string[] = [];
    if (mgmtOpen) reasons.push('Management interface has NO Permitted IP list configured (accessible from 0.0.0.0/0)');
    if (telnetActive) reasons.push('Insecure cleartext Telnet management protocol is enabled');
    if (httpActive) reasons.push('Unencrypted HTTP management is enabled');

    evaluations.push({
      id: 'SC-7',
      family: 'System and Communications Protection',
      title: 'Boundary Protection (Management Plane Isolation)',
      status: 'FAIL',
      score: 10,
      requirement: 'Monitor and control communications at external boundary and key internal boundaries. Separate management networks from operational traffic.',
      finding: `Critical management boundary exposure: ${reasons.join('; ')}.`,
      evidence: reasons,
      recommendation: 'Configure strict Permitted IP list under Device > Setup > Interfaces > Management. Disable HTTP and Telnet immediately to mitigate CVE-2024-0012.',
    });
  } else {
    evaluations.push({
      id: 'SC-7',
      family: 'System and Communications Protection',
      title: 'Boundary Protection (Management Plane Isolation)',
      status: 'PASS',
      score: 100,
      requirement: 'Monitor and control communications at external boundary and key internal boundaries.',
      finding: `Management interface is isolated to ${hardening.permittedIpList.length} trusted IP ranges; unencrypted management protocols (HTTP, Telnet) are disabled.`,
      evidence: [`Permitted IP list: ${hardening.permittedIpList.slice(0, 3).join(', ')}`],
      recommendation: 'Conduct periodic review of authorized management subnets and jumpbox hosts.',
    });
  }

  // 4. SC-7(5): Deny by Default & Interzone Traffic Dropping
  const defaultDropRules = securityRules.filter(
    (r) => !r.disabled && (r.action === 'drop' || r.action === 'deny') && r.fromZones.includes('any') && r.toZones.includes('any')
  );
  const defaultDropLogs = defaultDropRules.some((r) => r.logEnd);

  if (defaultDropRules.length === 0 || !defaultDropLogs) {
    evaluations.push({
      id: 'SC-7(5)',
      family: 'System and Communications Protection',
      title: 'Deny by Default with Explicit Drop Logging',
      status: defaultDropRules.length === 0 ? 'FAIL' : 'WARN',
      score: defaultDropRules.length === 0 ? 0 : 50,
      requirement: 'Enforce deny-by-default logic for all inter-zone and intra-zone communications and log all dropped connection attempts.',
      finding: defaultDropRules.length === 0
        ? 'No explicit default interzone drop rule configured in rulebase.'
        : 'Default interzone drop rule is present but log-end is disabled, blinding security operations to reconnaissance.',
      evidence: defaultDropRules.length > 0 ? [`Default drop rule "${defaultDropRules[0].name}" has log-end: no`] : ['Missing explicit default-deny rule'],
      recommendation: 'Override intrazone-default and interzone-default rules with Log at Session End enabled and attached to centralized Syslog.',
    });
  } else {
    evaluations.push({
      id: 'SC-7(5)',
      family: 'System and Communications Protection',
      title: 'Deny by Default with Explicit Drop Logging',
      status: 'PASS',
      score: 100,
      requirement: 'Enforce deny-by-default logic for all inter-zone communications with drop logging.',
      finding: 'Explicit default deny rule is in place with session drop logging enabled.',
      evidence: [`Rule "${defaultDropRules[0].name}" enforces default drop with log-end: yes`],
      recommendation: 'Monitor dropped connection volume via Panorama automated reports.',
    });
  }

  // 5. AU-2: Audit Events (Session Logging)
  const unloggedRules = securityRules.filter((r) => !r.disabled && !r.logEnd);
  if (unloggedRules.length > 0) {
    evaluations.push({
      id: 'AU-2',
      family: 'Audit and Accountability',
      title: 'Event Logging (Log at Session End)',
      status: unloggedRules.length > 2 ? 'FAIL' : 'WARN',
      score: Math.max(0, 100 - unloggedRules.length * 20),
      requirement: 'Identify that the system is capable of auditing predefined security-relevant events, including successful and rejected connection attempts.',
      finding: `${unloggedRules.length} active rule(s) do NOT have "Log at Session End" enabled.`,
      evidence: unloggedRules.slice(0, 4).map((r) => `Rule "${r.name}" has log-end: false`),
      recommendation: 'Enable "Log at Session End" on all active rules to guarantee audit trails for forensics and compliance.',
    });
  } else {
    evaluations.push({
      id: 'AU-2',
      family: 'Audit and Accountability',
      title: 'Event Logging (Log at Session End)',
      status: 'PASS',
      score: 100,
      requirement: 'Identify that the system is capable of auditing security-relevant events.',
      finding: 'All active security rules have session logging enabled.',
      evidence: [`Verified ${securityRules.length} rules enforce log-end.`],
      recommendation: 'Ensure log quotas and storage partitions are monitored.',
    });
  }

  // 6. AU-6: Audit Review, Analysis, and Reporting (Centralized SIEM/Panorama)
  const hasCentralLogging = hardening.panoramaForwardingConfigured || hardening.syslogServers.length > 0;
  if (!hasCentralLogging) {
    evaluations.push({
      id: 'AU-6',
      family: 'Audit and Accountability',
      title: 'Audit Review & Centralized Log Forwarding (SIEM/Panorama)',
      status: 'FAIL',
      score: 20,
      requirement: 'Integrate system audit logs with centralized log analysis and SIEM/SOAR infrastructure for incident detection.',
      finding: 'No remote Syslog servers or Panorama log collector configured. Logs exist only in local volatile firewall disk.',
      evidence: ['syslogServers: empty', 'panoramaForwarding: false'],
      recommendation: 'Configure redundant Syslog servers (Device > Server Profiles > Syslog) and attach Log Forwarding profiles to all permit rules.',
    });
  } else {
    evaluations.push({
      id: 'AU-6',
      family: 'Audit and Accountability',
      title: 'Audit Review & Centralized Log Forwarding (SIEM/Panorama)',
      status: 'PASS',
      score: 100,
      requirement: 'Integrate system audit logs with centralized log analysis infrastructure.',
      finding: hardening.panoramaForwardingConfigured
        ? 'Firewall forwards logs to Panorama management infrastructure.'
        : `Firewall forwards audit events to ${hardening.syslogServers.length} remote Syslog collectors.`,
      evidence: hardening.syslogServers.length ? hardening.syslogServers : ['Panorama log forwarding active'],
      recommendation: 'Verify heartbeat alerts on SIEM ingest collectors.',
    });
  }

  // 7. IA-2: Identification & Authentication (MFA & Password Complexity)
  const mfaAdmins = hardening.adminAccounts.filter((a) => a.hasMfa);
  const pwOk = hardening.passwordComplexity.enabled && hardening.passwordComplexity.minLength >= 14;

  if (mfaAdmins.length === 0 || !pwOk) {
    evaluations.push({
      id: 'IA-2',
      family: 'Identification and Authentication',
      title: 'Administrative Identification & MFA Enforcement',
      status: mfaAdmins.length === 0 ? 'FAIL' : 'WARN',
      score: mfaAdmins.length === 0 ? 30 : 60,
      requirement: 'Enforce multi-factor authentication for administrative access and apply strict password complexity controls.',
      finding: mfaAdmins.length === 0
        ? 'No administrative accounts have MFA / SAML IdP integration configured. Local credentials used.'
        : `Password complexity disabled or min length (${hardening.passwordComplexity.minLength}) is below NIST standard 14 characters.`,
      evidence: [
        `Admin accounts: ${hardening.adminAccounts.map((a) => `${a.name}(MFA:${a.hasMfa})`).join(', ')}`,
        `Password Complexity Enabled: ${hardening.passwordComplexity.enabled}, Min: ${hardening.passwordComplexity.minLength}`,
      ],
      recommendation: 'Enforce SAML 2.0 or RADIUS MFA for all admin accounts under Device > Administrators. Set minimum password length to 14+ characters.',
    });
  } else {
    evaluations.push({
      id: 'IA-2',
      family: 'Identification and Authentication',
      title: 'Administrative Identification & MFA Enforcement',
      status: 'PASS',
      score: 100,
      requirement: 'Enforce multi-factor authentication for administrative access.',
      finding: 'Administrative accounts require MFA authentication profile; password complexity is enforced.',
      evidence: [`${mfaAdmins.length} admins enforce MFA`, `Password complexity min length: ${hardening.passwordComplexity.minLength}`],
      recommendation: 'Enforce 90-day password rotation and revoke unused service accounts.',
    });
  }

  // 8. SC-8: Transmission Confidentiality & Decryption
  const tlsMin = hardening.sslTlsServiceProfile?.minVersion || 'tls1-0';
  const hasDecryption = decryptionRules.some((d) => !d.disabled && d.action === 'decrypt');
  const tlsOutdated = tlsMin === 'tls1-0' || tlsMin === 'tls1-1';

  if (tlsOutdated || !hasDecryption) {
    evaluations.push({
      id: 'SC-8',
      family: 'System and Communications Protection',
      title: 'Transmission Confidentiality & SSL/TLS Inspection',
      status: tlsOutdated ? 'FAIL' : 'WARN',
      score: tlsOutdated ? 35 : 65,
      requirement: 'Protect the confidentiality and integrity of transmitted information and inspect encrypted payload data for concealed threats.',
      finding: tlsOutdated
        ? `Management SSL/TLS profile permits obsolete ${tlsMin.toUpperCase()} protocol.`
        : 'No SSL Forward Proxy or Inbound Decryption policies configured; firewall is blind to malware inside encrypted HTTPS tunnels.',
      evidence: [
        `SSL/TLS Min Version: ${tlsMin}`,
        `Decryption Rules Active: ${decryptionRules.length}`,
      ],
      recommendation: 'Set SSL/TLS Service Profile min-version to TLS 1.2 or 1.3. Deploy SSL Forward Proxy Decryption for outbound web egress.',
    });
  } else {
    evaluations.push({
      id: 'SC-8',
      family: 'System and Communications Protection',
      title: 'Transmission Confidentiality & SSL/TLS Inspection',
      status: 'PASS',
      score: 100,
      requirement: 'Protect the confidentiality and integrity of transmitted information.',
      finding: 'TLS 1.2/1.3 is enforced on management surfaces and SSL Decryption inspection is active.',
      evidence: [`SSL Min Version: ${tlsMin}`, `${decryptionRules.length} decryption policy active`],
      recommendation: 'Maintain certificate authority root renewal schedules and exclusion lists for banking/healthcare.',
    });
  }

  // 9. CM-6: Configuration Settings (Hardening Baseline)
  const timeoutOk = hardening.sessionIdleTimeoutMinutes <= 15;
  const lockoutOk = hardening.failedAttemptsLockout > 0;
  if (!timeoutOk || !lockoutOk) {
    evaluations.push({
      id: 'CM-6',
      family: 'Configuration Management',
      title: 'Device Hardening & Session Timeout Settings',
      status: 'WARN',
      score: 60,
      requirement: 'Establish and document mandatory configuration settings for information technology products.',
      finding: `Session idle timeout is ${hardening.sessionIdleTimeoutMinutes}m (NIST requires <= 15m); failed login lockout is ${hardening.failedAttemptsLockout === 0 ? 'DISABLED' : `${hardening.failedAttemptsLockout} attempts`}.`,
      evidence: [
        `idleTimeout: ${hardening.sessionIdleTimeoutMinutes}m`,
        `failedAttemptsLockout: ${hardening.failedAttemptsLockout}`,
      ],
      recommendation: 'Set idle timeout to 10 or 15 minutes and configure account lockout after 3 failed attempts in Device > Setup > Management.',
    });
  } else {
    evaluations.push({
      id: 'CM-6',
      family: 'Configuration Management',
      title: 'Device Hardening & Session Timeout Settings',
      status: 'PASS',
      score: 100,
      requirement: 'Establish mandatory configuration settings for IT products.',
      finding: 'Session timeout (15m or less) and failed login lockout thresholds comply with NIST guidelines.',
      evidence: [`idleTimeout: ${hardening.sessionIdleTimeoutMinutes}m`, `lockout: ${hardening.failedAttemptsLockout} attempts`],
      recommendation: 'Maintain quarterly CIS benchmark checks.',
    });
  }

  // 10. SI-3 / SI-4: Threat Prevention (Security Profiles)
  const rulesWithoutProfiles = allowRules.filter((r) => !r.profileSetting || (!r.profileSetting.group && !r.profileSetting.virus));
  if (rulesWithoutProfiles.length > 0) {
    evaluations.push({
      id: 'SI-3/4',
      family: 'System and Information Integrity',
      title: 'Malicious Code Protection & Threat Inspection (Security Profiles)',
      status: rulesWithoutProfiles.length > 2 ? 'FAIL' : 'WARN',
      score: Math.max(0, 100 - (rulesWithoutProfiles.length / Math.max(1, allowRules.length)) * 100),
      requirement: 'Employ malicious code protection mechanisms at system entry and exit points to detect and eradicate malicious code.',
      finding: `${rulesWithoutProfiles.length} out of ${allowRules.length} permit rule(s) do NOT have Security Profile Groups (Antivirus, Anti-Spyware, Vulnerability Protection, WildFire) attached.`,
      evidence: rulesWithoutProfiles.slice(0, 3).map((r) => `Rule "${r.name}" has no security profile group attached`),
      recommendation: 'Apply comprehensive Security Profile Groups (including WildFire and DNS Security) to all allow rules.',
    });
  } else {
    evaluations.push({
      id: 'SI-3/4',
      family: 'System and Information Integrity',
      title: 'Malicious Code Protection & Threat Inspection (Security Profiles)',
      status: 'PASS',
      score: 100,
      requirement: 'Employ malicious code protection mechanisms at system entry and exit points.',
      finding: 'All active permit rules have Security Profile Groups attached for inline threat inspection.',
      evidence: [`All ${allowRules.length} allow rules are inspected with Threat Prevention profiles.`],
      recommendation: 'Keep WildFire analysis profiles configured to forward all executable and script file types.',
    });
  }

  const passedCount = evaluations.filter((e) => e.status === 'PASS').length;
  const failedCount = evaluations.filter((e) => e.status === 'FAIL').length;
  const warnCount = evaluations.filter((e) => e.status === 'WARN').length;
  const totalScore = evaluations.reduce((acc, curr) => acc + curr.score, 0);
  const compliancePercentage = Math.round(totalScore / evaluations.length);

  return {
    evaluations,
    compliancePercentage,
    passedCount,
    failedCount,
    warnCount,
  };
}
