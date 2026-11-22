import React from 'react';
import { AuditReportData } from '../types/panos';
import { Shield, AlertCircle, CheckCircle2, AlertTriangle, Printer, Download, Copy, Check } from 'lucide-react';
import { ReportTitlePage, ReportClosingPage, REPORT_DISCLAIMER } from './ReportBookends';

interface ThreePageReportProps {
  reportData: AuditReportData;
  onPrint: () => void;
}

export const ThreePageReport: React.FC<ThreePageReportProps> = ({ reportData, onPrint }) => {
  const { config, overallScore, riskTier, nistEvaluations, nistCompliancePercentage, zeroTrustPillars, zeroTrustOverallScore, cleanupSummary, advisories, releaseGuidance, topExecutiveRisks } = reportData;
  const [copiedCli, setCopiedCli] = React.useState(false);

  const criticalVulns = advisories.filter((a) => a.isVulnerable && a.severity === 'CRITICAL');
  const activeVulns = advisories.filter((a) => a.isVulnerable);

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cleanupSummary.cleanupCliCommands.join('\n'));
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `panos-audit-report-${config.metadata.hostname}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 print:p-0 print:m-0">
      {/* Top Banner Toolbar for on-screen view */}
      <div className="no-print mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Executive and Technical Configuration Review
            </h2>
            <p className="text-xs text-slate-400">
              Three-page snapshot for technical review. Validate findings against operational evidence before sign-off.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCli}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            {copiedCli ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedCli ? 'Copied CLI Script' : 'Copy CLI Script'}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Title page (printed as page 1) */}
      <ReportTitlePage config={config} />

      {/* ========================================================================= */}
      {/* PAGE 1: EXECUTIVE SUMMARY, SECURITY POSTURE & ADVISORIES                 */}
      {/* ========================================================================= */}
      <div className="report-page-1 mb-8 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-md print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print-surface">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 print:text-cyan-700">
              Palo Alto Networks NGFW & Panorama Audit Report · Page 2 of 5
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-0.5 print:text-slate-900">
              Executive Security & Compliance Assessment
            </h1>
            <div className="text-xs text-slate-400 print:text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
              <span>Host: <strong>{config.metadata.hostname}</strong></span>
              <span>·</span>
              <span>Model: <strong>{config.metadata.model}</strong></span>
              <span>·</span>
              <span>Serial: <strong>{config.metadata.serial}</strong></span>
              <span>·</span>
              <span>OS: <strong>PAN-OS {config.metadata.panOsVersion}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              riskTier === 'Critical Risk'
                ? 'bg-rose-950 text-rose-300 border border-rose-800 print:bg-rose-100 print:text-rose-800'
                : riskTier === 'High Risk'
                ? 'bg-amber-950 text-amber-300 border border-amber-800 print:bg-amber-100 print:text-amber-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800 print:bg-emerald-100 print:text-emerald-800'
            }`}>
              {riskTier}
            </div>
            <div className="text-[10px] text-slate-400 print:text-slate-600 mt-1 font-mono">
              Audit Date: {new Date(config.parsedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* 4 Key Executive KPI Blocks */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 print:text-slate-600">NIST 800-53 Score</div>
            <div className="text-2xl font-bold font-mono text-cyan-400 print:text-cyan-800 mt-0.5">
              {nistCompliancePercentage}%
            </div>
            <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
              {reportData.nistEvaluations.filter((e) => e.status === 'PASS').length} Passed / {reportData.nistEvaluations.length} Controls
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 print:text-slate-600">Zero Trust Alignment</div>
            <div className="text-2xl font-bold font-mono text-indigo-400 print:text-indigo-800 mt-0.5">
              {zeroTrustOverallScore}/100
            </div>
            <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
              {zeroTrustOverallScore >= 70 ? 'Defined / Maturing' : 'Developing / Low'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 print:text-slate-600">Critical Advisories</div>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${criticalVulns.length > 0 ? 'text-rose-400 print:text-rose-700' : 'text-emerald-400 print:text-emerald-700'}`}>
              {criticalVulns.length} Active
            </div>
            <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
              {activeVulns.length} Total Known CVEs
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 print:text-slate-600">Object Bloat</div>
            <div className="text-2xl font-bold font-mono text-amber-400 print:text-amber-700 mt-0.5">
              {cleanupSummary.unusedAddressObjects.length} Unused
            </div>
            <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
              {cleanupSummary.shadowRules.length} Shadow Rules Identified
            </div>
          </div>
        </div>

        {/* Executive Summary Narrative */}
        <div className="mb-4 p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-200 text-xs leading-relaxed">
          <div className="font-semibold text-slate-200 print:text-slate-900 mb-1 text-[11px] uppercase tracking-wider">
            Executive Summary
          </div>
          <p className="text-slate-300 print:text-slate-700 mb-1.5">
            This technical compliance assessment evaluated the configuration extracted from technical support file <strong>{config.sourceFileName}</strong> for firewall <strong>{config.metadata.hostname}</strong> ({config.metadata.model}, PAN-OS {config.metadata.panOsVersion}). The audit synthesized NIST SP 800-53 Rev 5 federal security controls, NIST SP 800-207 Zero Trust Architecture tenets, active PAN-OS Security Advisories, and field-tested community stability advisories.
          </p>
          <p className="text-slate-300 print:text-slate-700">
            The firewall currently carries an overall posture of <strong>{riskTier}</strong> (Score: {overallScore}/100). {criticalVulns.length > 0 ? `Immediate remediation is required due to ${criticalVulns.length} unmitigated Critical PAN-OS vulnerabilities (including ${criticalVulns.map(v => v.cveId).join(', ')}) with known active exploitation in the wild.` : 'No unpatched critical zero-day vulnerabilities detected.'} Furthermore, {cleanupSummary.unusedAddressObjects.length} unreferenced objects and {cleanupSummary.shadowRules.length} shadow policies were detected, which introduce operational overhead and lengthen commit durations.
          </p>
        </div>

        {/* Top 4 Immediate Executive Risks */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-2">
            Top Executive Risks & Recommended Actions
          </div>
          <div className="space-y-1.5">
            {topExecutiveRisks.slice(0, 4).map((risk, idx) => (
              <div key={idx} className="p-2.5 rounded bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200 flex items-start gap-2.5 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                  risk.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800 print:bg-rose-100 print:text-rose-800' :
                  risk.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800 print:bg-amber-100 print:text-amber-800' :
                  'bg-slate-800 text-slate-300 print:bg-slate-200 print:text-slate-800'
                }`}>
                  {risk.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 print:text-slate-900">{risk.title}</div>
                  <div className="text-[11px] text-slate-400 print:text-slate-600 mt-0.5">{risk.impact}</div>
                  <div className="text-[11px] text-cyan-400 print:text-cyan-800 font-medium mt-0.5">
                    <strong>Action:</strong> {risk.remediation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Advisories & Golden Release Target */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 print:text-slate-900">
              Potential advisory matches and release guidance
            </span>
            <span className="text-xs font-mono font-semibold text-cyan-400 print:text-cyan-800">
              Recommended Target: {releaseGuidance.recommendedGoldenRelease}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-950 text-slate-400 print:bg-slate-100 print:text-slate-700 text-[10px] uppercase font-mono">
                <tr>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300">Advisory / CVE</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300">CVSS</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300">Exploit Status</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300">Device Status</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300">Mitigation / Patch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-[11px]">
                {advisories.slice(0, 4).map((adv) => (
                  <tr key={adv.cveId} className={adv.isVulnerable ? 'bg-rose-950/20 print:bg-rose-50/50' : ''}>
                    <td className="py-1 px-2 font-mono font-semibold text-slate-200 print:text-slate-900">
                      {adv.cveId} <span className="text-[10px] text-slate-400 print:text-slate-500">({adv.panSaId})</span>
                    </td>
                    <td className="py-1 px-2 font-mono font-bold text-rose-400 print:text-rose-700">
                      {adv.cvss}
                    </td>
                    <td className="py-1 px-2">
                      {adv.exploitedInWild ? (
                        <span className="text-rose-400 print:text-rose-800 font-semibold">In the Wild</span>
                      ) : (
                        <span className="text-slate-400 print:text-slate-600">PoC / Theoretical</span>
                      )}
                    </td>
                    <td className="py-1 px-2">
                      {adv.isVulnerable ? (
                        <span className="text-rose-400 print:text-rose-700 font-bold">AFFECTED</span>
                      ) : (
                        <span className="text-emerald-400 print:text-emerald-700 font-semibold">NOT AFFECTED</span>
                      )}
                    </td>
                    <td className="py-1 px-2 text-[10px] text-slate-300 print:text-slate-700 truncate max-w-xs">
                      {adv.workaround || `Upgrade to ${adv.fixedIn[config.metadata.panOsVersion.split('.').slice(0, 2).join('.')] || releaseGuidance.recommendedGoldenRelease}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: NIST 800-53 COMPLIANCE & ZERO TRUST ARCHITECTURE GAP ANALYSIS    */}
      {/* ========================================================================= */}
      <div className="report-page-2 mb-8 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-md print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print-surface">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 print:text-cyan-700">
              Palo Alto Networks NGFW & Panorama Audit Report · Page 3 of 5
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mt-0.5 print:text-slate-900">
              NIST SP 800-53 Rev 5 & Zero Trust (NIST 800-207) Analysis
            </h2>
          </div>
          <div className="text-right text-xs font-mono text-slate-400 print:text-slate-600">
            NIST: <strong>{nistCompliancePercentage}%</strong> · ZTA: <strong>{zeroTrustOverallScore}/100</strong>
          </div>
        </div>

        {/* Section 1: NIST 800-53 Rev 5 Control Matrix */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-1.5 flex items-center justify-between">
            <span>NIST SP 800-53 Rev 5 Security Controls Evaluation</span>
            <span className="text-[10px] font-mono text-slate-400 print:text-slate-600 font-normal">
              Evaluated against XML Rulebase & System Configuration
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-950 text-slate-400 print:bg-slate-100 print:text-slate-700 text-[10px] uppercase font-mono">
                <tr>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300 w-16">Control</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300 w-44">Name</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300 w-16 text-center">Status</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300">Configuration Finding & Evidence</th>
                  <th className="py-1 px-2 border-b border-slate-800 print:border-slate-300">Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-[10.5px]">
                {nistEvaluations.map((evalItem) => (
                  <tr key={evalItem.id} className={evalItem.status === 'FAIL' ? 'bg-rose-950/15 print:bg-rose-50/40' : ''}>
                    <td className="py-1 px-2 font-mono font-bold text-cyan-400 print:text-cyan-800">{evalItem.id}</td>
                    <td className="py-1 px-2 font-medium text-slate-200 print:text-slate-900">{evalItem.title}</td>
                    <td className="py-1 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold ${
                        evalItem.status === 'PASS' ? 'bg-emerald-950 text-emerald-300 print:bg-emerald-100 print:text-emerald-800' :
                        evalItem.status === 'FAIL' ? 'bg-rose-950 text-rose-300 print:bg-rose-100 print:text-rose-800' :
                        'bg-amber-950 text-amber-300 print:bg-amber-100 print:text-amber-800'
                      }`}>
                        {evalItem.status}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-slate-300 print:text-slate-700 leading-tight">
                      {evalItem.finding}
                    </td>
                    <td className="py-1 px-2 text-slate-400 print:text-slate-600 text-[10px] leading-tight">
                      {evalItem.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Zero Trust Architecture (ZTA) Alignment Assessment */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-2 flex items-center justify-between">
            <span>Zero Trust Architecture (NIST SP 800-207) Maturity Analysis</span>
            <span className="text-[10px] font-mono text-indigo-400 print:text-indigo-800 font-semibold">
              Maturity: {zeroTrustOverallScore >= 70 ? 'Defined / Maturing' : 'Initial / Legacy Perimeter'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-3">
            {zeroTrustPillars.map((p) => (
              <div key={p.pillar} className="p-2 rounded bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200">
                <div className="text-[9.5px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-600 truncate">{p.pillar}</div>
                <div className={`text-base font-bold font-mono mt-0.5 ${p.score >= 70 ? 'text-emerald-400 print:text-emerald-800' : p.score >= 45 ? 'text-amber-400 print:text-amber-800' : 'text-rose-400 print:text-rose-800'}`}>
                  {p.score}%
                </div>
                <div className="text-[9px] text-slate-400 print:text-slate-500 truncate mt-0.5">
                  {p.metrics[0]?.value}
                </div>
              </div>
            ))}
          </div>

          {/* Zero Trust Strategic Gap & Transformation Matrix */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-200 text-xs">
            <div className="font-semibold text-slate-200 print:text-slate-900 mb-1 text-[10.5px] uppercase tracking-wider">
              Zero Trust Gap Analysis & Action Roadmap
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300 print:text-slate-700 leading-normal">
              <div>
                <strong className="text-cyan-400 print:text-cyan-800">1. Identity & Device-ID Enforcement:</strong>
                <p className="text-[10.5px] text-slate-400 print:text-slate-600 mt-0.5">
                  Replace bare IP addresses with User-ID mapping (Active Directory / Azure AD / Okta). Enforce Host Information Profile (HIP) checking on endpoints to ensure disk encryption and EDR are active prior to allowing access.
                </p>
                <strong className="text-cyan-400 print:text-cyan-800 mt-2 block">2. Least Privilege App-ID Adoption:</strong>
                <p className="text-[10.5px] text-slate-400 print:text-slate-600 mt-0.5">
                  Decommission "application: any" policies. Use PAN-OS Policy Optimizer to transition broad port rules to application-default App-ID rules to stop arbitrary port tunneling.
                </p>
              </div>
              <div>
                <strong className="text-cyan-400 print:text-cyan-800">3. SSL Decryption & Threat Visibility:</strong>
                <p className="text-[10.5px] text-slate-400 print:text-slate-600 mt-0.5">
                  Deploy SSL Forward Proxy with enterprise root CA certificate for high-risk outbound egress. Without decryption, threat prevention engines are blind to encrypted ransomware payloads.
                </p>
                <strong className="text-cyan-400 print:text-cyan-800 mt-2 block">4. Continuous Threat Inspection Baseline:</strong>
                <p className="text-[10.5px] text-slate-400 print:text-slate-600 mt-0.5">
                  Attach full Security Profile Groups (Antivirus, Anti-Spyware with DNS Security, Vulnerability, URL Filtering, WildFire) to 100% of allow rules, including internal interzone traffic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: HYGIENE, CLEANUP, HARDENING & REDDIT/COMMUNITY GUIDANCE          */}
      {/* ========================================================================= */}
      <div className="report-page-3 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-md print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print-surface">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 print:text-cyan-700">
              Palo Alto Networks NGFW & Panorama Audit Report · Page 4 of 5
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mt-0.5 print:text-slate-900">
              Hygiene Cleanup, Device Hardening & Community Advisory
            </h2>
          </div>
          <div className="text-right text-xs font-mono text-slate-400 print:text-slate-600">
            Unused Objects: <strong>{cleanupSummary.unusedAddressObjects.length}</strong> · Shadow Rules: <strong>{cleanupSummary.shadowRules.length}</strong>
          </div>
        </div>

        {/* Section 1: Object & Policy Hygiene Summary */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-1.5 flex items-center justify-between">
            <span>Orphaned Objects & Redundant Policies</span>
            <span className="text-[10px] font-mono text-amber-400 print:text-amber-800">
              {cleanupSummary.unusedAddressObjects.length} Unused Addresses / {cleanupSummary.totalAddressObjects} Total ({Math.round((cleanupSummary.unusedAddressObjects.length / Math.max(1, cleanupSummary.totalAddressObjects)) * 100)}% Bloat)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200 text-xs">
              <div className="font-semibold text-slate-200 print:text-slate-900 mb-1 flex items-center justify-between">
                <span>Shadowed / Redundant Rules ({cleanupSummary.shadowRules.length})</span>
                <span className="text-[10px] font-mono text-slate-400 print:text-slate-600">0 Hit Count</span>
              </div>
              {cleanupSummary.shadowRules.length > 0 ? (
                <ul className="space-y-1 text-[10.5px] text-slate-300 print:text-slate-700">
                  {cleanupSummary.shadowRules.slice(0, 3).map((s, idx) => (
                    <li key={idx} className="truncate">
                      <strong>{s.ruleName}</strong>: Shadowed by <em>"{s.shadowedByRule}"</em>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[11px] text-emerald-400 print:text-emerald-700">No shadow rules detected. Rule evaluation order is clean.</div>
              )}
            </div>

            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200 text-xs">
              <div className="font-semibold text-slate-200 print:text-slate-900 mb-1 flex items-center justify-between">
                <span>Unreferenced Address Objects ({cleanupSummary.unusedAddressObjects.length})</span>
                <span className="text-[10px] text-slate-400 print:text-slate-600">Review references before removal</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 print:text-slate-600 truncate">
                {cleanupSummary.unusedAddressObjects.slice(0, 5).map((o) => o.name).join(', ') || 'Clean. No orphaned address objects.'}
              </div>
              <div className="mt-1 text-[10px] text-cyan-400 print:text-cyan-800">
                Purging these reduces commit times and firewall memory consumption.
              </div>
            </div>
          </div>

          {/* Sample CLI Cleanup Script */}
          <div className="p-2 rounded bg-slate-950 border border-slate-800 print:bg-slate-100 print:border-slate-300 font-mono text-[9.5px] text-slate-300 print:text-slate-800 overflow-hidden">
            <div className="text-slate-400 print:text-slate-600 font-semibold mb-0.5">
              # Automated PAN-OS CLI Cleanup Snippet (Extract):
            </div>
            {cleanupSummary.cleanupCliCommands.slice(0, 6).map((cmd, idx) => (
              <div key={idx} className="truncate">{cmd}</div>
            ))}
            {cleanupSummary.cleanupCliCommands.length > 6 && (
              <div className="text-slate-400 print:text-slate-600 italic">
                ... (+{cleanupSummary.cleanupCliCommands.length - 6} more commands available in Object Hygiene tab)
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Device Hardening Baseline */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-1.5">
            Device Hardening Baseline Checklist
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10.5px]">
            <div className={`p-2 rounded border ${config.hardening.permittedIpList.length > 0 ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 print:bg-emerald-50 print:text-emerald-900 print:border-slate-200' : 'bg-rose-950/30 border-rose-800/50 text-rose-300 print:bg-rose-50 print:text-rose-900 print:border-slate-200'}`}>
              <div className="font-bold">Permitted IP List</div>
              <div className="text-[10px] mt-0.5">{config.hardening.permittedIpList.length > 0 ? 'Configured' : 'MISSING (0.0.0.0/0)'}</div>
            </div>

            <div className={`p-2 rounded border ${!config.hardening.services.http && !config.hardening.services.telnet ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 print:bg-emerald-50 print:text-emerald-900 print:border-slate-200' : 'bg-rose-950/30 border-rose-800/50 text-rose-300 print:bg-rose-50 print:text-rose-900 print:border-slate-200'}`}>
              <div className="font-bold">HTTP / Telnet</div>
              <div className="text-[10px] mt-0.5">{!config.hardening.services.http && !config.hardening.services.telnet ? 'Disabled (Secure)' : 'ENABLED (Insecure)'}</div>
            </div>

            <div className={`p-2 rounded border ${config.hardening.sslTlsServiceProfile?.minVersion !== 'tls1-0' && config.hardening.sslTlsServiceProfile?.minVersion !== 'tls1-1' ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 print:bg-emerald-50 print:text-emerald-900 print:border-slate-200' : 'bg-amber-950/30 border-amber-800/50 text-amber-300 print:bg-amber-50 print:text-amber-900 print:border-slate-200'}`}>
              <div className="font-bold">SSL/TLS Version</div>
              <div className="text-[10px] mt-0.5 font-mono">{config.hardening.sslTlsServiceProfile?.minVersion?.toUpperCase() || 'TLS1.0'}</div>
            </div>

            <div className={`p-2 rounded border ${config.hardening.sessionIdleTimeoutMinutes <= 15 ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 print:bg-emerald-50 print:text-emerald-900 print:border-slate-200' : 'bg-amber-950/30 border-amber-800/50 text-amber-300 print:bg-amber-50 print:text-amber-900 print:border-slate-200'}`}>
              <div className="font-bold">Idle Timeout</div>
              <div className="text-[10px] mt-0.5">{config.hardening.sessionIdleTimeoutMinutes} mins ({config.hardening.sessionIdleTimeoutMinutes <= 15 ? 'Pass' : 'Warn > 15m'})</div>
            </div>
          </div>
        </div>

        {/* Section 3: Release Notes & Reddit / Community Known Issues */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-1.5 flex items-center justify-between">
            <span>Release Notes Guidance & Reddit Community Bug Sentiments</span>
            <span className="text-[10px] font-mono text-cyan-400 print:text-cyan-800 font-semibold">
              Target: {releaseGuidance.recommendedGoldenRelease}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {releaseGuidance.redditCommunitySentiments.slice(0, 2).map((item, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-800 print:bg-slate-50 print:border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 print:text-slate-900 text-[11px]">
                    {item.title}
                  </span>
                  <span className={`text-[9.5px] font-mono px-1 rounded ${item.sentiment === 'Critical Warning' ? 'bg-rose-950 text-rose-300 print:bg-rose-100 print:text-rose-800' : item.sentiment === 'Caution' ? 'bg-amber-950 text-amber-300 print:bg-amber-100 print:text-amber-800' : 'bg-emerald-950 text-emerald-300 print:bg-emerald-100 print:text-emerald-800'}`}>
                    {item.subreddit} · {item.sentiment}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-400 print:text-slate-600 mt-0.5 leading-snug">
                  {item.summary}
                </div>
                {item.reportedBugs.length > 0 && (
                  <div className="text-[9.5px] font-mono text-amber-400 print:text-amber-700 mt-0.5">
                    Known PAN Bug IDs: {item.reportedBugs.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign-off & Audit Authorization Block */}
        <div className="mt-4 pt-3 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-xs text-slate-400 print:text-slate-600">
          <div>
            <div>Audited by: <strong>PAN-OS TSF Compliance Engine</strong></div>
            <div className="text-[10px] mt-0.5 font-mono">Configuration snapshot · verify against source file</div>
          </div>
          <div className="flex gap-8 text-right">
            <div>
              <div className="text-[10px] uppercase">SecOps Lead Approval</div>
              <div className="border-b border-slate-700 w-32 mt-3" />
            </div>
            <div>
              <div className="text-[10px] uppercase">CISO / Director Sign-off</div>
              <div className="border-b border-slate-700 w-32 mt-3" />
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 pt-2 border-t border-slate-800 print:border-slate-300 text-[9px] leading-snug text-slate-400 print:text-slate-600">
          <strong>Disclaimer:</strong> {REPORT_DISCLAIMER}
        </p>
      </div>

      {/* Closing page (printed as page 5) */}
      <ReportClosingPage />
    </div>
  );
};
