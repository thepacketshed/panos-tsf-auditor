import { PanOsConfig, SecurityAdvisory, ReleaseGuidance, AuditReportData } from '../types/panos';
import { KNOWN_ADVISORIES, TAC_RELEASE_GUIDANCE, COMMUNITY_REDDIT_ISSUES } from '../data/advisoriesAndIssues';
import { evaluateNistControls } from './nistAuditor';
import { evaluateZeroTrust } from './zeroTrustAuditor';
import { evaluateCleanupAndHygiene } from './cleanupAuditor';

/**
 * Compares two PAN-OS version strings (e.g. "10.2.8" vs "10.2.9-h1").
 * Returns -1 if v1 < v2, 1 if v1 > v2, 0 if equal.
 */
export function comparePanOsVersions(v1: string, v2: string): number {
  // Normalize strings: remove prefixes like 'pan-os '
  const clean1 = v1.toLowerCase().replace(/^pan-os\s*/, '').trim();
  const clean2 = v2.toLowerCase().replace(/^pan-os\s*/, '').trim();

  // Split into major.minor.patch and hotfix
  const parseParts = (v: string) => {
    const [main, hotfix] = v.split('-h');
    const nums = main.split('.').map((n) => parseInt(n, 10) || 0);
    const hf = hotfix ? parseInt(hotfix, 10) || 0 : 0;
    return { nums, hf };
  };

  const p1 = parseParts(clean1);
  const p2 = parseParts(clean2);

  // Compare main numbers (major, minor, patch)
  const maxLen = Math.max(p1.nums.length, p2.nums.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = p1.nums[i] || 0;
    const num2 = p2.nums[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  // If main numbers equal, compare hotfix
  if (p1.hf < p2.hf) return -1;
  if (p1.hf > p2.hf) return 1;
  return 0;
}

/**
 * Evaluates which security advisories affect this device based on PAN-OS version & active features.
 */
export function matchSecurityAdvisories(config: PanOsConfig): SecurityAdvisory[] {
  const version = config.metadata.panOsVersion;
  const track = version.split('.').slice(0, 2).join('.'); // e.g. "10.2"
  const isGpActive = config.hardening.globalProtectConfigured;
  const isMgmtExposed = config.hardening.permittedIpList.length === 0;
  const isSamlActive = config.hardening.samlConfigured;

  return KNOWN_ADVISORIES.map((adv) => {
    const fixedInMap: Record<string, string> = {};
    adv.affectedConditions.versionChecks.forEach((vc) => {
      fixedInMap[vc.track] = vc.fixedIn;
    });

    const matchingTrack = adv.affectedConditions.versionChecks.find((vc) => vc.track === track);
    let isVulnerable = false;

    if (matchingTrack) {
      const isBelowFixed = comparePanOsVersions(version, matchingTrack.vulnerableIfBelow) < 0;

      if (isBelowFixed) {
        // Check feature prerequisites
        let featurePrereqMet = true;
        if (adv.affectedConditions.requiresGlobalProtect && !isGpActive) {
          featurePrereqMet = false;
        }
        if (adv.affectedConditions.requiresWebMgmtExposed && !isMgmtExposed) {
          featurePrereqMet = false; // Mitigated by permitted IP list!
        }
        if (adv.affectedConditions.requiresSaml && !isSamlActive) {
          featurePrereqMet = false;
        }

        isVulnerable = featurePrereqMet;
      }
    }

    return {
      cveId: adv.cveId,
      panSaId: adv.panSaId,
      title: adv.title,
      cvss: adv.cvss,
      severity: adv.severity,
      affectedVersions: adv.affectedConditions.versionChecks.map((v) => `${v.track}.x (< ${v.vulnerableIfBelow})`),
      isVulnerable,
      mitigationAvailable: Boolean(adv.workaround),
      exploitedInWild: adv.exploitedInWild,
      description: adv.description,
      fixedIn: fixedInMap,
      workaround: adv.workaround,
      appliedOnDevice: !isVulnerable,
    };
  });
}

/**
 * Obtains TAC Release Guidance and matches Reddit / Community issues for the specific device and version.
 */
export function getReleaseAndCommunityGuidance(config: PanOsConfig): ReleaseGuidance {
  const version = config.metadata.panOsVersion;
  const track = version.split('.').slice(0, 2).join('.');
  const model = config.metadata.model;

  const trackInfo = TAC_RELEASE_GUIDANCE[track] || {
    track,
    status: 'Maintenance' as const,
    recommendedGoldenRelease: '10.2.11-h2',
    notes: ['General release guidance recommends upgrading to latest maintenance release.'],
    upgradePath: ['Upgrade to target maintenance release'],
  };

  // Find relevant Reddit / Community posts matching this version or model family
  const relevantCommunityPosts = COMMUNITY_REDDIT_ISSUES.filter((post) => {
    const versionMatch = post.affectedVersions.some((v) => version.includes(v) || v.includes(version));
    const modelMatch = post.affectedHardware.some((h) => model.toLowerCase().includes(h.toLowerCase().slice(0, 5)));
    return versionMatch || modelMatch;
  });

  return {
    currentVersion: version,
    recommendedGoldenRelease: trackInfo.recommendedGoldenRelease,
    upgradePath: trackInfo.upgradePath,
    trackStatus: trackInfo.status,
    releaseNotesHighlights: trackInfo.notes,
    redditCommunitySentiments: relevantCommunityPosts.map((p) => ({
      title: p.title,
      subreddit: p.subreddit,
      sentiment: p.sentiment,
      summary: p.summary,
      reportedBugs: p.reportedBugs,
    })),
  };
}

/**
 * Builds the complete Audit Report data structure combining NIST, Zero Trust, Cleanup, Advisories, and Community guidance.
 */
export function generateAuditReport(config: PanOsConfig): AuditReportData {
  const nistResult = evaluateNistControls(config);
  const ztResult = evaluateZeroTrust(config);
  const cleanup = evaluateCleanupAndHygiene(config);
  const advisories = matchSecurityAdvisories(config);
  const releaseGuidance = getReleaseAndCommunityGuidance(config);

  // Overall Score (Weighted: NIST 45%, Zero Trust 35%, Vulnerabilities 20%)
  const critVulns = advisories.filter((a) => a.isVulnerable && a.severity === 'CRITICAL').length;
  const highVulns = advisories.filter((a) => a.isVulnerable && a.severity === 'HIGH').length;
  const vulnPenalty = Math.min(100, critVulns * 35 + highVulns * 15);
  const vulnScore = Math.max(0, 100 - vulnPenalty);

  const overallScore = Math.round(
    nistResult.compliancePercentage * 0.45 +
    ztResult.overallScore * 0.35 +
    vulnScore * 0.20
  );

  let riskTier: AuditReportData['riskTier'] = 'Hardened & Compliant';
  if (critVulns > 0 || overallScore < 50) riskTier = 'Critical Risk';
  else if (highVulns > 0 || overallScore < 70) riskTier = 'High Risk';
  else if (overallScore < 85) riskTier = 'Moderate Risk';

  // Generate Top 5 Executive Risks
  const topExecutiveRisks: AuditReportData['topExecutiveRisks'] = [];

  if (critVulns > 0) {
    const cv = advisories.find((a) => a.isVulnerable && a.severity === 'CRITICAL')!;
    topExecutiveRisks.push({
      title: `Active Critical Vulnerability (${cv.cveId} - CVSS ${cv.cvss})`,
      impact: `${cv.title}. Actively exploited in the wild with known remote code execution or authentication bypass.`,
      remediation: `Upgrade immediately to ${releaseGuidance.recommendedGoldenRelease} or apply mitigation: ${cv.workaround || 'isolate service'}`,
      severity: 'CRITICAL',
    });
  }

  if (config.hardening.permittedIpList.length === 0) {
    topExecutiveRisks.push({
      title: 'Management Interface Open to All IPs (0.0.0.0/0)',
      impact: 'Lack of Permitted IP restriction allows any network host to access administrative login, exposing the system to CVE-2024-0012 auth bypass.',
      remediation: 'Immediately configure trusted management IP subnets under Device > Setup > Interfaces > Management.',
      severity: 'CRITICAL',
    });
  }

  const unloggedRulesCount = config.securityRules.filter((r) => !r.disabled && !r.logEnd).length;
  if (unloggedRulesCount > 0) {
    topExecutiveRisks.push({
      title: `Audit Logging Blind Spot (${unloggedRulesCount} rules unlogged)`,
      impact: 'Traffic passing through rules without "Log at Session End" leaves no audit trail, violating NIST AU-2 and forensics standards.',
      remediation: 'Enable session end logging on all permit and default drop rules and forward to SIEM.',
      severity: 'HIGH',
    });
  }

  if (config.decryptionRules.length === 0) {
    topExecutiveRisks.push({
      title: 'Zero SSL/TLS Decryption Visibility',
      impact: '100% of encrypted outbound HTTPS traffic bypasses threat prevention, App-ID, and DLP inspection, violating Zero Trust tenets.',
      remediation: 'Implement SSL Forward Proxy Decryption with enterprise PKI certificate for high-risk outbound categories.',
      severity: 'HIGH',
    });
  }

  if (cleanup.unusedAddressObjects.length > 5 || cleanup.shadowRules.length > 0) {
    topExecutiveRisks.push({
      title: `Firewall Policy Bloat (${cleanup.unusedAddressObjects.length} unused objects, ${cleanup.shadowRules.length} shadow rules)`,
      impact: 'Orphaned objects and redundant policies degrade firewall commit speed and increase operational audit friction.',
      remediation: 'Execute the automated hygiene CLI cleanup script to purge unreferenced objects and prune shadow rules.',
      severity: 'MEDIUM',
    });
  }

  return {
    config,
    overallScore,
    riskTier,
    nistEvaluations: nistResult.evaluations,
    nistCompliancePercentage: nistResult.compliancePercentage,
    zeroTrustPillars: ztResult.pillars,
    zeroTrustOverallScore: ztResult.overallScore,
    cleanupSummary: cleanup,
    advisories,
    releaseGuidance,
    topExecutiveRisks,
  };
}
