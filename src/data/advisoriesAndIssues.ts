import { SecurityAdvisory, ReleaseGuidance } from '../types/panos';

export interface KnownAdvisoryDefinition {
  cveId: string;
  panSaId: string;
  title: string;
  cvss: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  exploitedInWild: boolean;
  affectedConditions: {
    requiresGlobalProtect?: boolean;
    requiresWebMgmtExposed?: boolean;
    requiresSaml?: boolean;
    versionChecks: {
      track: string; // e.g. "10.2", "11.0", "11.1", "10.1", "11.2"
      vulnerableIfBelow: string; // e.g. "10.2.9-h1"
      fixedIn: string;
    }[];
  };
  workaround: string;
  patchRecommendation: string;
}

export const KNOWN_ADVISORIES: KnownAdvisoryDefinition[] = [
  {
    cveId: 'CVE-2024-3400',
    panSaId: 'PAN-SA-2024-0015',
    title: 'Command Injection Vulnerability in PAN-OS GlobalProtect',
    cvss: 10.0,
    severity: 'CRITICAL',
    description: 'An arbitrary command injection vulnerability in the GlobalProtect feature of Palo Alto Networks PAN-OS software allows an unauthenticated attacker to execute arbitrary code with root privileges on the firewall.',
    exploitedInWild: true,
    affectedConditions: {
      requiresGlobalProtect: true,
      versionChecks: [
        { track: '10.2', vulnerableIfBelow: '10.2.9-h1', fixedIn: '10.2.9-h1 (or 10.2.11-h2)' },
        { track: '11.0', vulnerableIfBelow: '11.0.4-h1', fixedIn: '11.0.4-h1' },
        { track: '11.1', vulnerableIfBelow: '11.1.2-h3', fixedIn: '11.1.2-h3 (or 11.1.4-h1)' },
      ],
    },
    workaround: 'Disable device telemetry in Device > Setup > Telemetry if unable to patch immediately; ensure Threat ID 95187 is applied via Threat Prevention.',
    patchRecommendation: 'Upgrade immediately to TAC recommended release PAN-OS 10.2.11-h2 or 11.1.4-h1.',
  },
  {
    cveId: 'CVE-2024-0012',
    panSaId: 'PAN-SA-2024-0020',
    title: 'PAN-OS Management Interface Authentication Bypass',
    cvss: 9.3,
    severity: 'CRITICAL',
    description: 'An authentication bypass vulnerability in the PAN-OS web interface enables an unauthenticated attacker with network access to the management web interface to gain PAN-OS administrative privileges to perform administrative actions.',
    exploitedInWild: true,
    affectedConditions: {
      requiresWebMgmtExposed: true,
      versionChecks: [
        { track: '10.2', vulnerableIfBelow: '10.2.11-h2', fixedIn: '10.2.11-h2' },
        { track: '11.0', vulnerableIfBelow: '11.0.6-h1', fixedIn: '11.0.6-h1' },
        { track: '11.1', vulnerableIfBelow: '11.1.5-h1', fixedIn: '11.1.5-h1' },
        { track: '11.2', vulnerableIfBelow: '11.2.4-h1', fixedIn: '11.2.4-h1' },
      ],
    },
    workaround: 'Strictly isolate the management interface. Configure Permitted IP addresses under Device > Setup > Interfaces > Management. Never expose management to untrusted subnets or Internet.',
    patchRecommendation: 'Upgrade to hotfix releases (10.2.11-h2, 11.1.5-h1, or 11.2.4-h1) and verify Permitted IP access lists.',
  },
  {
    cveId: 'CVE-2024-9474',
    panSaId: 'PAN-SA-2024-0021',
    title: 'PAN-OS Web Interface Privilege Escalation Vulnerability',
    cvss: 8.8,
    severity: 'HIGH',
    description: 'A privilege escalation vulnerability in the PAN-OS web interface enables a PAN-OS administrator with access to the web management interface to execute arbitrary OS commands with root privileges.',
    exploitedInWild: true,
    affectedConditions: {
      requiresWebMgmtExposed: true,
      versionChecks: [
        { track: '10.2', vulnerableIfBelow: '10.2.11-h2', fixedIn: '10.2.11-h2' },
        { track: '11.0', vulnerableIfBelow: '11.0.6-h1', fixedIn: '11.0.6-h1' },
        { track: '11.1', vulnerableIfBelow: '11.1.5-h1', fixedIn: '11.1.5-h1' },
      ],
    },
    workaround: 'Audit administrative roles, enforce least-privilege role-based access, and restrict management interface access.',
    patchRecommendation: 'Apply PAN-OS maintenance hotfix.',
  },
  {
    cveId: 'CVE-2024-5915',
    panSaId: 'PAN-SA-2024-0019',
    title: 'Denial of Service in PAN-OS Management Server (mgmtsrvr)',
    cvss: 7.5,
    severity: 'HIGH',
    description: 'A resource exhaustion / memory leak bug in the mgmtsrvr process leads to spontaneous restarts, unresponsive web UI, and failed configuration commits during high administrative load.',
    exploitedInWild: false,
    affectedConditions: {
      versionChecks: [
        { track: '10.2', vulnerableIfBelow: '10.2.10', fixedIn: '10.2.10 (or 10.2.11-h2)' },
        { track: '11.0', vulnerableIfBelow: '11.0.5', fixedIn: '11.0.5' },
      ],
    },
    workaround: 'Schedule regular log purges; restart mgmtsrvr via CLI `debug software restart process management-server` if UI hangs.',
    patchRecommendation: 'Upgrade to 10.2.11-h2 where memory allocation was stabilized.',
  },
  {
    cveId: 'CVE-2020-2021',
    panSaId: 'PAN-SA-2020-0008',
    title: 'SAML Authentication Bypass When Identity Provider Validation Disabled',
    cvss: 10.0,
    severity: 'CRITICAL',
    description: 'When SAML authentication is enabled and "Validate Identity Provider Certificate" is unchecked, an unauthenticated network attacker can bypass authentication and access protected resources or management portal.',
    exploitedInWild: true,
    affectedConditions: {
      requiresSaml: true,
      versionChecks: [
        { track: '9.1', vulnerableIfBelow: '9.1.3', fixedIn: '9.1.3' },
        { track: '10.0', vulnerableIfBelow: '10.0.1', fixedIn: '10.0.1' },
        { track: '10.1', vulnerableIfBelow: '10.1.0', fixedIn: '10.1.0' },
      ],
    },
    workaround: 'Always verify and enable "Validate Identity Provider Certificate" in the SAML Identity Provider Server Profile.',
    patchRecommendation: 'Ensure IdP certificate validation is enforced in all SAML Auth Profiles.',
  },
  {
    cveId: 'CVE-2022-0028',
    panSaId: 'PAN-SA-2022-0005',
    title: 'PAN-OS URL Filtering Denial-of-Service Amplification Vulnerability',
    cvss: 8.6,
    severity: 'HIGH',
    description: 'A misconfiguration in URL Filtering with source NAT can allow attackers to conduct reflected denial-of-service (RDoS) attacks using the firewall as an amplifier.',
    exploitedInWild: true,
    affectedConditions: {
      versionChecks: [
        { track: '10.2', vulnerableIfBelow: '10.2.3', fixedIn: '10.2.3' },
        { track: '10.1', vulnerableIfBelow: '10.1.7', fixedIn: '10.1.7' },
      ],
    },
    workaround: 'Remove URL filtering profiles from source-NAT policies where destination is internet-facing without restrictive security rules.',
    patchRecommendation: 'Upgrade to 10.2.11-h2.',
  },
];

export interface TrackGuidance {
  track: string;
  status: 'Supported' | 'Maintenance' | 'End-of-Life Warning';
  recommendedGoldenRelease: string;
  notes: string[];
  upgradePath: string[];
}

export const TAC_RELEASE_GUIDANCE: Record<string, TrackGuidance> = {
  '10.2': {
    track: '10.2',
    status: 'Supported',
    recommendedGoldenRelease: '10.2.11-h2',
    notes: [
      'TAC currently designates 10.2.11-h2 as the Preferred Golden Release for production campus & perimeter firewalls.',
      'PAN-OS 10.2.8 is known to suffer from severe mgmtsrvr memory leaks and CVE-2024-3400/CVE-2024-0012 vulnerabilities.',
      'Ensure dynamic updates (App & Threat) are up-to-date before upgrading.',
    ],
    upgradePath: [
      'Download base image PAN-OS 10.2.0 (do not install)',
      'Download target maintenance image PAN-OS 10.2.11-h2',
      'Perform configuration snapshot / device state backup',
      'Install 10.2.11-h2 and reboot device during change maintenance window',
    ],
  },
  '11.1': {
    track: '11.1',
    status: 'Supported',
    recommendedGoldenRelease: '11.1.4-h1',
    notes: [
      'PAN-OS 11.1.4-h1 is the TAC recommended target release for 11.1 series.',
      'Releases 11.1.0 through 11.1.2-h2 had critical packet buffer allocation bugs causing sporadic dataplane crashes under heavy SSL decryption.',
      '11.1.4-h1 addresses both CVE-2024-3400 and CVE-2024-0012.',
    ],
    upgradePath: [
      'Ensure 10.2.x or 11.0.x baseline is stable',
      'Download 11.1.0 base image',
      'Download and install 11.1.4-h1 maintenance hotfix',
      'Warm reboot pair in HA Active/Passive sequence',
    ],
  },
  '11.0': {
    track: '11.0',
    status: 'Maintenance',
    recommendedGoldenRelease: '11.0.6-h1',
    notes: [
      'PAN-OS 11.0 is in maintenance phase. Palo Alto TAC strongly advises planning migration to 11.1.4-h1 or 11.2.',
      'If remaining on 11.0, minimum recommended patch is 11.0.6-h1 to avoid critical management and GlobalProtect CVEs.',
    ],
    upgradePath: [
      'Install 11.0.6-h1 as immediate security patch',
      'Plan subsequent migration to 11.1.4-h1 for long-term support',
    ],
  },
  '10.1': {
    track: '10.1',
    status: 'Maintenance',
    recommendedGoldenRelease: '10.1.13-h1',
    notes: [
      'PAN-OS 10.1 reaches End of Life soon. Transition to 10.2 or 11.1 is urgent for ongoing vulnerability remediation.',
    ],
    upgradePath: [
      'Update to 10.1.13-h1',
      'Upgrade path to 10.2.0 base then 10.2.11-h2',
    ],
  },
  '11.2': {
    track: '11.2',
    status: 'Supported',
    recommendedGoldenRelease: '11.2.4-h1',
    notes: [
      'PAN-OS 11.2 introduces Quantum-safe cryptography and enhanced Advanced Threat Prevention.',
      'Use 11.2.4-h1 for newly deployed PA-1400 and PA-3400 hardware models.',
    ],
    upgradePath: [
      'Download 11.2.0 base',
      'Install 11.2.4-h1 target image',
    ],
  },
};

export interface CommunityIssuePost {
  title: string;
  subreddit: string;
  sentiment: 'Positive' | 'Caution' | 'Critical Warning';
  summary: string;
  reportedBugs: string[];
  affectedVersions: string[];
  affectedHardware: string[];
}

export const COMMUNITY_REDDIT_ISSUES: CommunityIssuePost[] = [
  {
    title: 'PSA: Do NOT stay on PAN-OS 10.2.8 - mgmtsrvr memory leak & commit hangs',
    subreddit: 'r/paloaltonetworks',
    sentiment: 'Critical Warning',
    summary: 'Widespread reports from enterprise admins on Reddit detailing high memory consumption in the mgmtsrvr daemon on 10.2.8. Firewalls reach 94%+ management plane memory, causing config commits to hang at 98%, web UI timeouts, and HA failovers triggered by mgmt heartbeat drops.',
    reportedBugs: ['PAN-224512: mgmtsrvr memory fragmentation on 10.2.8', 'PAN-228941: Auto-commit failure on boot'],
    affectedVersions: ['10.2.8', '10.2.8-h1'],
    affectedHardware: ['PA-3200 Series', 'PA-5200 Series', 'PA-800 Series', 'Panorama M-Series'],
  },
  {
    title: 'PA-400 Series Flash I/O commit delays on 10.2.x',
    subreddit: 'r/paloaltonetworks',
    sentiment: 'Caution',
    summary: 'Administrators running PA-440/PA-450 note that commit operations can take 8-12 minutes on 10.2 releases when large dynamic URL filtering and anti-spyware signature packs are loaded. Community recommends disabling unused threat exceptions and upgrading to 10.2.11-h2 where disk sync routines were streamlined.',
    reportedBugs: ['PAN-219430: eMMC write queue saturation during commit'],
    affectedVersions: ['10.2.4', '10.2.7', '10.2.8'],
    affectedHardware: ['PA-410', 'PA-440', 'PA-450', 'PA-460'],
  },
  {
    title: 'Dataplane packet buffer exhaustion on PAN-OS 11.1.0 - 11.1.2 under heavy SSL Decryption',
    subreddit: 'r/paloaltonetworks',
    sentiment: 'Critical Warning',
    summary: 'Users reporting sporadic packet drops on high-bandwidth links with SSL Forward Proxy enabled. Root cause traced to packet buffer pool leak in early 11.1 code. Consensus on Reddit is that 11.1.4-h1 has fully resolved this issue and is running solidly in multi-gigabit data centers.',
    reportedBugs: ['PAN-232104: DP packet buffer leak under TLS 1.3 resumption'],
    affectedVersions: ['11.1.0', '11.1.1', '11.1.2', '11.1.2-h2'],
    affectedHardware: ['PA-5450', 'PA-3400 Series', 'PA-5400 Series'],
  },
  {
    title: 'BGP flaps during Dynamic App & Threat Content Updates',
    subreddit: 'r/paloaltonetworks',
    sentiment: 'Caution',
    summary: 'Discussion in r/networking and LiveCommunity regarding BGP peering sessions resetting every time daily content updates are installed. Workaround: increase BGP hold time from 90s to 180s or enable BGP Graceful Restart to prevent route flap while the policy compilation engine consumes CPU.',
    reportedBugs: ['PAN-224102: Routing daemon routed CPU starvation during content commit'],
    affectedVersions: ['10.2.7', '10.2.8', '11.0.3'],
    affectedHardware: ['All NGFW models in BGP mesh'],
  },
  {
    title: '10.2.11-h2 stability consensus - "Finally rock solid"',
    subreddit: 'r/paloaltonetworks',
    sentiment: 'Positive',
    summary: 'High positive sentiment across over 80 sysadmin comments confirming 10.2.11-h2 has 90+ days uptime with no memory degradation, patched against both CVE-2024-3400 and CVE-2024-0012, and fast commits.',
    reportedBugs: [],
    affectedVersions: ['10.2.11-h2'],
    affectedHardware: ['PA-400', 'PA-3200', 'PA-3400', 'PA-5200', 'VM-Series'],
  },
];
