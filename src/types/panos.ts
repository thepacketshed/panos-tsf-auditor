/**
 * Palo Alto Networks PAN-OS & Panorama Configuration Types
 */

export interface SecurityRule {
  id: string;
  name: string;
  fromZones: string[];
  toZones: string[];
  sources: string[];
  destinations: string[];
  applications: string[];
  services: string[];
  action: 'allow' | 'deny' | 'drop' | 'reset-client' | 'reset-server' | 'reset-both';
  logStart: boolean;
  logEnd: boolean;
  logSetting?: string;
  profileSetting?: {
    group?: string[];
    virus?: string[];
    spyware?: string[];
    vulnerability?: string[];
    urlFiltering?: string[];
    fileBlocking?: string[];
    wildfire?: string[];
    dnsSecurity?: string[];
  };
  sourceUsers: string[];
  hipProfiles?: string[];
  disabled: boolean;
  description?: string;
  tag?: string[];
  vsys?: string;
  deviceGroup?: string;
}

export interface NatRule {
  id: string;
  name: string;
  fromZones: string[];
  toZones: string[];
  source: string[];
  destination: string[];
  service: string;
  translationType?: string;
}

export interface AddressObject {
  name: string;
  type: 'ip-netmask' | 'ip-range' | 'fqdn' | 'wildcard';
  value: string;
  description?: string;
  tags?: string[];
  isUsed?: boolean;
  usedInRules?: string[];
}

export interface AddressGroupObject {
  name: string;
  type: 'static' | 'dynamic';
  members: string[];
  description?: string;
  tags?: string[];
  isUsed?: boolean;
}

export interface ServiceObject {
  name: string;
  protocol: 'tcp' | 'udp';
  port: string;
  description?: string;
  isUsed?: boolean;
}

export interface DecryptionRule {
  name: string;
  fromZones: string[];
  toZones: string[];
  sources: string[];
  destinations: string[];
  action: 'no-decrypt' | 'decrypt';
  type: 'ssl-forward-proxy' | 'ssl-inbound-inspection' | 'ssh-proxy';
  disabled: boolean;
}

export interface DeviceHardeningSettings {
  hostname: string;
  domain?: string;
  ipAddress?: string;
  netmask?: string;
  defaultGateway?: string;
  dnsServers: string[];
  ntpServers: {
    primary?: string;
    secondary?: string;
    authEnabled?: boolean;
  };
  permittedIpList: string[]; // Allowed IPs to access management plane
  services: {
    http: boolean;
    https: boolean;
    telnet: boolean;
    ssh: boolean;
    snmp: boolean;
    ping: boolean;
  };
  sslTlsServiceProfile?: {
    name: string;
    minVersion: 'tls1-0' | 'tls1-1' | 'tls1-2' | 'tls1-3';
    maxVersion?: string;
  };
  sshCryptoProfile?: {
    ciphersHardened: boolean;
    macsHardened: boolean;
    details?: string;
  };
  adminAccounts: {
    name: string;
    role: string;
    authenticationProfile?: string;
    hasMfa: boolean;
  }[];
  passwordComplexity: {
    enabled: boolean;
    minLength: number;
    requireUppercase?: boolean;
    requireNumeric?: boolean;
    requireSpecial?: boolean;
    maxDaysToExpire?: number;
  };
  sessionIdleTimeoutMinutes: number;
  failedAttemptsLockout: number;
  panoramaForwardingConfigured: boolean;
  syslogServers: string[];
  loginBannerConfigured: boolean;
  globalProtectConfigured: boolean;
  samlConfigured: boolean;
  samlCertValidated?: boolean;
}

export interface PanOsConfig {
  sourceFileName: string;
  parsedAt: string;
  metadata: {
    hostname: string;
    model: string;
    serial: string;
    panOsVersion: string;
    uptime?: string;
    isPanorama: boolean;
    vsysList: string[];
    deviceGroups?: string[];
    appVersion?: string;
    threatVersion?: string;
  };
  securityRules: SecurityRule[];
  natRules: NatRule[];
  addressObjects: AddressObject[];
  addressGroups: AddressGroupObject[];
  serviceObjects: ServiceObject[];
  decryptionRules: DecryptionRule[];
  hardening: DeviceHardeningSettings;
  rawXmlPreview?: string;
}

export interface NistControlEvaluation {
  id: string; // e.g., "AC-3", "SC-7(5)"
  family: string; // "Access Control", "System and Communications Protection"
  title: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  score: number; // 0 to 100
  requirement: string;
  finding: string;
  evidence: string[];
  recommendation: string;
}

export interface ZeroTrustPillarScore {
  pillar: 'Identity & User' | 'Least Privilege App-ID' | 'Continuous Inspection' | 'Encrypted Traffic Visibility' | 'Micro-segmentation';
  score: number; // 0-100
  weight: number;
  status: 'Optimal' | 'Developing' | 'At Risk';
  metrics: { label: string; value: string; passed: boolean }[];
  findings: string[];
  recommendations: string[];
}

export interface UnusedCleanupSummary {
  totalAddressObjects: number;
  unusedAddressObjects: AddressObject[];
  totalServiceObjects: number;
  unusedServiceObjects: ServiceObject[];
  totalAddressGroups: number;
  unusedAddressGroups: AddressGroupObject[];
  shadowRules: {
    ruleName: string;
    shadowedByRule: string;
    reason: string;
  }[];
  overlyPermissiveRules: {
    ruleName: string;
    reason: string;
    risk: 'High' | 'Medium';
  }[];
  cleanupCliCommands: string[];
}

export interface SecurityAdvisory {
  cveId: string;
  panSaId: string;
  title: string;
  cvss: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  affectedVersions: string[];
  isVulnerable: boolean;
  mitigationAvailable: boolean;
  exploitedInWild: boolean;
  description: string;
  fixedIn: Record<string, string>; // e.g. { "10.2": "10.2.9-h1", "11.0": "11.0.4-h1" }
  workaround?: string;
  appliedOnDevice: boolean;
}

export interface ReleaseGuidance {
  currentVersion: string;
  recommendedGoldenRelease: string;
  upgradePath: string[];
  trackStatus: 'Supported' | 'Maintenance' | 'End-of-Life Warning';
  releaseNotesHighlights: string[];
  redditCommunitySentiments: {
    title: string;
    subreddit: string;
    sentiment: 'Positive' | 'Caution' | 'Critical Warning';
    summary: string;
    reportedBugs: string[];
    discussionUrl?: string;
  }[];
}

export interface AuditReportData {
  config: PanOsConfig;
  overallScore: number;
  riskTier: 'Critical Risk' | 'High Risk' | 'Moderate Risk' | 'Hardened & Compliant';
  nistEvaluations: NistControlEvaluation[];
  nistCompliancePercentage: number;
  zeroTrustPillars: ZeroTrustPillarScore[];
  zeroTrustOverallScore: number;
  cleanupSummary: UnusedCleanupSummary;
  advisories: SecurityAdvisory[];
  releaseGuidance: ReleaseGuidance;
  topExecutiveRisks: {
    title: string;
    impact: string;
    remediation: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }[];
}
