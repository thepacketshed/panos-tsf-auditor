import React from 'react';
import { ZeroTrustPillarScore } from '../types/panos';
import { Layers, ShieldCheck, UserCheck, Eye, Network, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface ZeroTrustTabProps {
  pillars: ZeroTrustPillarScore[];
  overallScore: number;
}

export const ZeroTrustTab: React.FC<ZeroTrustTabProps> = ({ pillars, overallScore }) => {
  const getPillarIcon = (name: string) => {
    switch (name) {
      case 'Identity & User':
        return <UserCheck className="h-5 w-5 text-indigo-400" />;
      case 'Least Privilege App-ID':
        return <ShieldCheck className="h-5 w-5 text-cyan-400" />;
      case 'Continuous Inspection':
        return <Eye className="h-5 w-5 text-emerald-400" />;
      case 'Encrypted Traffic Visibility':
        return <Eye className="h-5 w-5 text-amber-400" />;
      case 'Micro-segmentation':
        return <Network className="h-5 w-5 text-purple-400" />;
      default:
        return <Layers className="h-5 w-5 text-cyan-400" />;
    }
  };

  const maturityLevel =
    overallScore >= 85 ? 'Advanced (Zero Trust Aligned)' :
    overallScore >= 65 ? 'Defined / Maturing' :
    overallScore >= 40 ? 'Developing' : 'Initial (Legacy Perimeter)';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Zero Trust Maturity Banner */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Layers className="h-3.5 w-3.5" />
              <span>NIST SP 800-207 Zero Trust Architecture</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Zero Trust Architecture Alignment: {overallScore}/100
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Zero Trust shifts security from static, perimeter-based defenses to focusing on users, assets, and resources. Palo Alto NGFW acts as the core Policy Enforcement Point (PEP) for App-ID, User-ID, and continuous threat inspection.
            </p>
          </div>

          <div className="text-right p-4 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Maturity Level</div>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">{maturityLevel}</div>
            <div className="text-[11px] text-slate-400 mt-1">Weight-Adjusted 5-Pillar Score</div>
          </div>
        </div>

        {/* Progress Bar Gauge */}
        <div className="mt-6">
          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
            <span>Perimeter-Only (0-39)</span>
            <span>Developing (40-64)</span>
            <span>Defined (65-84)</span>
            <span>Advanced ZTA (85-100)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallScore >= 75 ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' :
                overallScore >= 50 ? 'bg-gradient-to-r from-amber-500 to-cyan-500' :
                'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5 Pillars Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {pillars.map((pillar) => (
          <div
            key={pillar.pillar}
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    {getPillarIcon(pillar.pillar)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{pillar.pillar}</h3>
                    <div className="text-[11px] text-slate-400 font-mono">Weight: {pillar.weight}%</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xl font-bold font-mono ${
                    pillar.score >= 75 ? 'text-emerald-400' :
                    pillar.score >= 45 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {pillar.score}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">{pillar.status}</div>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2 mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                {pillar.metrics.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{m.label}:</span>
                    <span className={`font-mono font-medium ${m.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Findings */}
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Architecture Findings:
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {pillar.findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-400 shrink-0 mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendations */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">
                Zero Trust Transition Action:
              </div>
              <ul className="space-y-1 text-xs text-slate-400">
                {pillar.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <ArrowRight className="h-3 w-3 text-cyan-500 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Strategic Roadmap for PAN-OS Zero Trust Adoption */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-2">
          Recommended Strategic Zero Trust Transformation Roadmap
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Follow this 4-step phased implementation to transition this firewall from legacy perimeter allow-all rules to strict Zero Trust policy enforcement.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="text-xs font-mono font-bold text-cyan-400 mb-1">Phase 1: User-ID Integration</div>
            <div className="text-slate-300 font-medium mb-2">Map Identities to IP Addresses</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Deploy PAN-OS User-ID Agent or Azure AD / Okta integration. Transition internal and outbound access rules from static subnets to authenticated AD security groups.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="text-xs font-mono font-bold text-indigo-400 mb-1">Phase 2: Policy Optimizer (App-ID)</div>
            <div className="text-slate-300 font-medium mb-2">Replace Port Rules with App-ID</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Use PAN-OS Policy Optimizer to review rules permitting "application: any". Replace generic TCP/UDP rules with explicit App-IDs and "application-default" ports.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="text-xs font-mono font-bold text-amber-400 mb-1">Phase 3: SSL Decryption Egress</div>
            <div className="text-slate-300 font-medium mb-2">Eliminate Blind Spots</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Deploy enterprise PKI Forward Trust CA certificate. Enable SSL Forward Proxy decryption on high-risk egress categories with privacy exclusions for healthcare/financial.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="text-xs font-mono font-bold text-emerald-400 mb-1">Phase 4: Continuous Inspection</div>
            <div className="text-slate-300 font-medium mb-2">Attach Strict Profile Groups</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Attach standard Security Profile Groups (Antivirus, Anti-Spyware with DNS Sinkhole, Vulnerability, WildFire) to 100% of allow rules, including East-West internal traffic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
