import { PanOsConfig, ZeroTrustPillarScore } from '../types/panos';

export function evaluateZeroTrust(config: PanOsConfig): {
  pillars: ZeroTrustPillarScore[];
  overallScore: number;
  maturityTier: 'Initial (Perimeter-Only)' | 'Developing' | 'Defined' | 'Advanced (Zero Trust Aligned)';
  summary: string;
} {
  const { securityRules, decryptionRules } = config;
  const allowRules = securityRules.filter((r) => !r.disabled && r.action === 'allow');
  const totalAllow = Math.max(1, allowRules.length);

  // 1. Identity & User-ID Pillar
  const userIdRules = allowRules.filter(
    (r) => r.sourceUsers.length > 0 && !r.sourceUsers.includes('any')
  );
  const hipRules = allowRules.filter((r) => r.hipProfiles && r.hipProfiles.length > 0);
  const userIdRate = Math.round((userIdRules.length / totalAllow) * 100);
  const hipRate = Math.round((hipRules.length / totalAllow) * 100);

  let identityScore = 20;
  if (userIdRate > 70) identityScore = 95;
  else if (userIdRate > 40) identityScore = 75;
  else if (userIdRate > 10) identityScore = 50;

  const identityPillar: ZeroTrustPillarScore = {
    pillar: 'Identity & User',
    score: identityScore,
    weight: 25,
    status: identityScore >= 75 ? 'Optimal' : identityScore >= 45 ? 'Developing' : 'At Risk',
    metrics: [
      { label: 'User-ID Policy Coverage', value: `${userIdRate}% (${userIdRules.length}/${totalAllow} rules)`, passed: userIdRate >= 50 },
      { label: 'Device Posture / HIP Verification', value: `${hipRate}% (${hipRules.length}/${totalAllow} rules)`, passed: hipRate > 0 },
    ],
    findings: [
      userIdRate < 40
        ? `Over ${(100 - userIdRate)}% of allow rules rely solely on static IP addresses without verifying the authenticated user identity.`
        : 'User-ID is actively integrated across key access policies.',
      hipRules.length === 0
        ? 'No Host Information Profile (HIP) checks are active; device health and disk encryption state are unverified prior to resource grant.'
        : 'Device health posture checks are active on critical access rules.',
    ],
    recommendations: [
      'Enable GlobalProtect User-ID agent or Active Directory / Azure AD integration to convert IP-based allow rules to Identity-based rules.',
      'Enforce HIP (Host Information Profile) verification for remote workers accessing sensitive internal subnets.',
    ],
  };

  // 2. Least Privilege App-ID Pillar
  const explicitAppRules = allowRules.filter((r) => !r.applications.includes('any'));
  const appDefaultRules = allowRules.filter((r) => r.services.includes('application-default'));
  const appRate = Math.round((explicitAppRules.length / totalAllow) * 100);
  const appDefaultRate = Math.round((appDefaultRules.length / totalAllow) * 100);

  let appScore = 25;
  if (appRate >= 80 && appDefaultRate >= 60) appScore = 95;
  else if (appRate >= 50) appScore = 70;
  else if (appRate >= 25) appScore = 45;

  const appPillar: ZeroTrustPillarScore = {
    pillar: 'Least Privilege App-ID',
    score: appScore,
    weight: 25,
    status: appScore >= 75 ? 'Optimal' : appScore >= 45 ? 'Developing' : 'At Risk',
    metrics: [
      { label: 'Specific App-ID Adoption', value: `${appRate}% (${explicitAppRules.length}/${totalAllow} rules)`, passed: appRate >= 70 },
      { label: 'Application-Default Service Port', value: `${appDefaultRate}% (${appDefaultRules.length}/${totalAllow} rules)`, passed: appDefaultRate >= 50 },
    ],
    findings: [
      appRate < 60
        ? `${totalAllow - explicitAppRules.length} allow rule(s) permit "application: any", behaving like a legacy L4 firewall instead of an L7 NGFW.`
        : 'High adoption of App-ID prevents unauthorized protocol tunneling.',
      appDefaultRate < 50
        ? 'Multiple rules do not specify "application-default", allowing allowed applications on arbitrary non-standard ports.'
        : 'Enforces application-default ports on majority of rules.',
    ],
    recommendations: [
      'Run PAN-OS Policy Optimizer to convert "application: any" rules into specific detected applications.',
      'Switch service definitions from custom port lists to "application-default" to block command-and-control masquerading.',
    ],
  };

  // 3. Continuous Threat Inspection Pillar
  const fullProfileRules = allowRules.filter((r) => {
    if (!r.profileSetting) return false;
    if (r.profileSetting.group && r.profileSetting.group.length > 0) return true;
    return Boolean(r.profileSetting.virus && r.profileSetting.vulnerability);
  });
  const profileRate = Math.round((fullProfileRules.length / totalAllow) * 100);

  let threatScore = 20;
  if (profileRate >= 85) threatScore = 95;
  else if (profileRate >= 50) threatScore = 65;
  else if (profileRate >= 20) threatScore = 40;

  const threatPillar: ZeroTrustPillarScore = {
    pillar: 'Continuous Inspection',
    score: threatScore,
    weight: 20,
    status: threatScore >= 75 ? 'Optimal' : threatScore >= 45 ? 'Developing' : 'At Risk',
    metrics: [
      { label: 'Threat Profile Coverage', value: `${profileRate}% (${fullProfileRules.length}/${totalAllow} rules)`, passed: profileRate >= 80 },
      { label: 'DNS Security & Anti-Spyware', value: profileRate >= 50 ? 'Active' : 'Missing / Incomplete', passed: profileRate >= 50 },
    ],
    findings: [
      profileRate < 80
        ? `${totalAllow - fullProfileRules.length} permit rule(s) lack complete Security Profiles, leaving allowed connections uninspected for exploits, spyware, and ransomware.`
        : 'Robust inline threat inspection active across operational rules.',
    ],
    recommendations: [
      'Create and enforce a baseline "Strict-Threat-Group" containing Antivirus, Anti-Spyware (with DNS Sinkhole), Vulnerability Protection, and WildFire.',
      'Attach this Security Profile Group to every allow rule including internal interzone traffic.',
    ],
  };

  // 4. Encrypted Traffic Visibility (SSL Decryption)
  const activeDecryptRules = decryptionRules.filter((d) => !d.disabled && d.action === 'decrypt');
  let decryptScore = 15;
  if (activeDecryptRules.length >= 3) decryptScore = 90;
  else if (activeDecryptRules.length >= 1) decryptScore = 65;

  const decryptPillar: ZeroTrustPillarScore = {
    pillar: 'Encrypted Traffic Visibility',
    score: decryptScore,
    weight: 15,
    status: decryptScore >= 70 ? 'Optimal' : decryptScore >= 50 ? 'Developing' : 'At Risk',
    metrics: [
      { label: 'SSL Forward Proxy Rules', value: `${activeDecryptRules.length} active rule(s)`, passed: activeDecryptRules.length > 0 },
      { label: 'TLS Inspection Blind Spots', value: activeDecryptRules.length > 0 ? 'Mitigated' : 'Critical (100% Blind)', passed: activeDecryptRules.length > 0 },
    ],
    findings: [
      activeDecryptRules.length === 0
        ? 'Zero SSL Decryption rules configured. Over 85% of modern enterprise web traffic is encrypted, completely blinding App-ID and Threat Prevention engines.'
        : 'SSL Decryption policy is active for corporate egress traffic.',
    ],
    recommendations: [
      'Deploy SSL Forward Proxy with enterprise PKI root CA for outbound user traffic.',
      'Configure SSL Decryption Exclusions for HIPAA/PCI compliance (e.g. Financial Services, Health and Medicine categories).',
    ],
  };

  // 5. Micro-segmentation & Zone Boundaries
  const interzoneRules = allowRules.filter(
    (r) => r.fromZones.join('') !== r.toZones.join('') && !r.fromZones.includes('any') && !r.toZones.includes('any')
  );
  const microScore = interzoneRules.length > 2 ? 80 : 45;

  const microPillar: ZeroTrustPillarScore = {
    pillar: 'Micro-segmentation',
    score: microScore,
    weight: 15,
    status: microScore >= 70 ? 'Optimal' : 'Developing',
    metrics: [
      { label: 'Explicit Interzone Segmentation', value: `${interzoneRules.length} explicit zone rules`, passed: interzoneRules.length > 2 },
      { label: 'Flat Network Risk', value: interzoneRules.length > 2 ? 'Segmented' : 'Elevated Flat Trust', passed: interzoneRules.length > 2 },
    ],
    findings: [
      interzoneRules.length < 3
        ? 'Internal networks show signs of flat trust boundaries. Workstation and server subnets are not strictly segmented.'
        : 'Distinct security zones isolate user endpoints, DMZ services, and internal servers.',
    ],
    recommendations: [
      'Implement micro-segmentation between production database tiers, application servers, and user subnets.',
      'Prohibit direct lateral workstation-to-workstation communication.',
    ],
  };

  const pillars = [identityPillar, appPillar, threatPillar, decryptPillar, microPillar];
  const overallScore = Math.round(
    pillars.reduce((acc, p) => acc + (p.score * p.weight) / 100, 0)
  );

  let maturityTier: 'Initial (Perimeter-Only)' | 'Developing' | 'Defined' | 'Advanced (Zero Trust Aligned)' = 'Initial (Perimeter-Only)';
  if (overallScore >= 85) maturityTier = 'Advanced (Zero Trust Aligned)';
  else if (overallScore >= 65) maturityTier = 'Defined';
  else if (overallScore >= 40) maturityTier = 'Developing';

  const summary = `Zero Trust Alignment Score: ${overallScore}/100 (${maturityTier}). Primary gaps include ${
    identityScore < 50 ? 'lack of User-ID authentication on access rules' : ''
  } ${appScore < 50 ? 'and heavy reliance on legacy L4 port-based rules' : ''} ${
    decryptScore < 50 ? 'and absence of SSL Decryption inspection' : ''
  }.`;

  return {
    pillars,
    overallScore,
    maturityTier,
    summary,
  };
}
