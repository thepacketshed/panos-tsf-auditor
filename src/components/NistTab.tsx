import React, { useState } from 'react';
import { NistControlEvaluation } from '../types/panos';
import { CheckCircle2, AlertTriangle, XCircle, Search, Filter } from 'lucide-react';

interface NistTabProps {
  evaluations: NistControlEvaluation[];
  compliancePercentage: number;
}

export const NistTab: React.FC<NistTabProps> = ({ evaluations, compliancePercentage }) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'FAIL' | 'WARN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = evaluations.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.finding.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const passedCount = evaluations.filter((e) => e.status === 'PASS').length;
  const failedCount = evaluations.filter((e) => e.status === 'FAIL').length;
  const warnCount = evaluations.filter((e) => e.status === 'WARN').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header Stat Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">NIST Compliance Score</div>
          <div className="text-3xl font-bold font-mono text-cyan-400 mt-1">{compliancePercentage}%</div>
          <div className="text-xs text-slate-400 mt-1">Based on NIST SP 800-53 Rev 5</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-medium">Passed Controls</div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">{passedCount}</div>
          <div className="text-xs text-slate-400 mt-1">Full compliance verified</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-rose-400 font-medium">Failed Controls</div>
          <div className="text-3xl font-bold font-mono text-rose-400 mt-1">{failedCount}</div>
          <div className="text-xs text-slate-400 mt-1">Action required immediately</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-medium">Warnings / Gaps</div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-1">{warnCount}</div>
          <div className="text-xs text-slate-400 mt-1">Partial or sub-optimal setting</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Controls ({evaluations.length})
          </button>
          <button
            onClick={() => setFilterStatus('FAIL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === 'FAIL' ? 'bg-rose-950 text-rose-200 border border-rose-800/60' : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Failed ({failedCount})
          </button>
          <button
            onClick={() => setFilterStatus('WARN')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === 'WARN' ? 'bg-amber-950 text-amber-200 border border-amber-800/60' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Warnings ({warnCount})
          </button>
          <button
            onClick={() => setFilterStatus('PASS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === 'PASS' ? 'bg-emerald-950 text-emerald-200 border border-emerald-800/60' : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            Passed ({passedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search control ID, name, or finding..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Control Cards */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-xl border transition-all ${
              item.status === 'FAIL'
                ? 'bg-rose-950/10 border-rose-900/40 hover:border-rose-800/60'
                : item.status === 'WARN'
                ? 'bg-amber-950/10 border-amber-900/40 hover:border-amber-800/60'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {item.id}
                </span>
                <span className="text-xs text-slate-400">· {item.family}</span>
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
              </div>

              <span
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  item.status === 'PASS'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : item.status === 'FAIL'
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                    : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                }`}
              >
                {item.status === 'PASS' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {item.status === 'FAIL' && <XCircle className="h-3.5 w-3.5" />}
                {item.status === 'WARN' && <AlertTriangle className="h-3.5 w-3.5" />}
                <span>{item.status}</span>
              </span>
            </div>

            <div className="text-xs text-slate-300 mb-3 bg-slate-950/40 p-2.5 rounded border border-slate-800/80">
              <strong className="text-slate-400 uppercase text-[10px] tracking-wider block mb-1">NIST Requirement:</strong>
              {item.requirement}
            </div>

            <div className="mb-3">
              <strong className="text-slate-400 uppercase text-[10px] tracking-wider block mb-1">Configuration Finding:</strong>
              <div className="text-xs text-slate-200 leading-relaxed font-medium">
                {item.finding}
              </div>
            </div>

            {item.evidence.length > 0 && (
              <div className="mb-3">
                <strong className="text-slate-400 uppercase text-[10px] tracking-wider block mb-1">Configuration Evidence Extracted:</strong>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  {item.evidence.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-cyan-500">&gt;</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-cyan-400">
              <span className="font-bold uppercase text-[10px] tracking-wider shrink-0 mt-0.5 text-slate-400">Remediation:</span>
              <span className="text-slate-200">{item.recommendation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
