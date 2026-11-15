import React from 'react';
import { SecurityAdvisory, ReleaseGuidance } from '../types/panos';
import { AlertTriangle, ShieldAlert, CheckCircle2, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';

interface AdvisoriesTabProps {
  advisories: SecurityAdvisory[];
  releaseGuidance: ReleaseGuidance;
  panOsVersion: string;
  model: string;
}

export const AdvisoriesTab: React.FC<AdvisoriesTabProps> = ({
  advisories,
  releaseGuidance,
  panOsVersion,
  model,
}) => {
  const vulnerableCount = advisories.filter((a) => a.isVulnerable).length;
  const criticalCount = advisories.filter((a) => a.isVulnerable && a.severity === 'CRITICAL').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Overview Banner */}
      <div className="mb-6 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Running PAN-OS {panOsVersion}
            </span>
            <span className="text-xs text-slate-400">· Model {model}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Security Advisories & Community Release Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Correlating active configuration parameters against Palo Alto Security Advisories (PSIRT), TAC Golden Release guidance, and r/paloaltonetworks field reports.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Vulnerable CVEs</div>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${criticalCount > 0 ? 'text-rose-400' : vulnerableCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {vulnerableCount}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{criticalCount} Critical (CVSS &ge; 9.0)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-center">
            <div className="text-[10px] uppercase font-bold text-cyan-300">TAC Golden Release</div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {releaseGuidance.recommendedGoldenRelease}
            </div>
            <div className="text-[10px] text-cyan-400 mt-0.5">Target Upgrade Track</div>
          </div>
        </div>
      </div>

      {/* Recommended Golden Release & Upgrade Path Banner */}
      <div className="mb-8 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            <span>TAC Recommended Software Upgrade Roadmap</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Track Status: <strong className="text-cyan-400">{releaseGuidance.trackStatus}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              TAC Release Notes Highlights:
            </div>
            <ul className="space-y-1.5 text-slate-400">
              {releaseGuidance.releaseNotesHighlights.map((note, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-cyan-400 shrink-0 mt-0.5">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              Recommended Upgrade Steps:
            </div>
            <ol className="space-y-1.5 text-slate-300 font-mono text-[11px]">
              {releaseGuidance.upgradePath.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Security Advisories List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">
            Palo Alto Networks Security Advisories (PSIRT) Evaluation
          </h3>
          <span className="text-xs text-slate-400">
            Assessed against PAN-OS {panOsVersion} & active services
          </span>
        </div>

        <div className="space-y-4">
          {advisories.map((adv) => (
            <div
              key={adv.cveId}
              className={`p-5 rounded-xl border transition-all ${
                adv.isVulnerable
                  ? 'bg-rose-950/15 border-rose-900/50'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded">
                    {adv.cveId}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">({adv.panSaId})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    adv.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    adv.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    CVSS {adv.cvss} · {adv.severity}
                  </span>
                  {adv.exploitedInWild && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                      EXPLOITED IN THE WILD
                    </span>
                  )}
                </div>

                <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                  adv.isVulnerable
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {adv.isVulnerable ? 'DEVICE AFFECTED' : 'NOT AFFECTED / PATCHED'}
                </div>
              </div>

              <h4 className="text-sm font-bold text-white mb-2">{adv.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {adv.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                <div>
                  <strong className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                    Affected PAN-OS Versions:
                  </strong>
                  <div className="font-mono text-[11px] text-slate-300">
                    {adv.affectedVersions.join(' · ')}
                  </div>
                </div>

                <div>
                  <strong className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                    Mitigation / Workaround:
                  </strong>
                  <div className="text-[11px] text-amber-300">
                    {adv.workaround || 'No official workaround. Upgrade required.'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reddit / Community Sentiment Tracker */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-bold text-white">
            r/paloaltonetworks Community Bug Reports & Sysadmin Sentiments
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Unfiltered field reports, confirmed bug IDs, and operational caveats shared by enterprise firewall engineers in production networks.
        </p>

        <div className="space-y-3">
          {releaseGuidance.redditCommunitySentiments.map((post, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-200 text-sm">{post.title}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  post.sentiment === 'Critical Warning' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                  post.sentiment === 'Caution' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                  'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {post.subreddit} · {post.sentiment}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed mb-2.5">
                {post.summary}
              </p>

              {post.reportedBugs.length > 0 && (
                <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-amber-400">
                  <span className="text-slate-400 font-sans">Reported Palo Alto Bug IDs: </span>
                  {post.reportedBugs.join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
