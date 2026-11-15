import React, { useState } from 'react';
import { SecurityRule } from '../types/panos';
import { Search, Filter, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface RulesExplorerTabProps {
  securityRules: SecurityRule[];
}

export const RulesExplorerTab: React.FC<RulesExplorerTabProps> = ({ securityRules }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'allow' | 'deny' | 'drop'>('ALL');
  const [selectedRule, setSelectedRule] = useState<SecurityRule | null>(null);

  const filteredRules = securityRules.filter((r) => {
    const matchesAction = actionFilter === 'ALL' || r.action === actionFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sources.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.destinations.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.applications.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.fromZones.some((z) => z.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.toZones.some((z) => z.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-2 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActionFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              actionFilter === 'ALL' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Rules ({securityRules.length})
          </button>
          <button
            onClick={() => setActionFilter('allow')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              actionFilter === 'allow' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Allow Rules ({securityRules.filter((r) => r.action === 'allow').length})
          </button>
          <button
            onClick={() => setActionFilter('drop')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              actionFilter === 'drop' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deny / Drop ({securityRules.filter((r) => r.action === 'drop' || r.action === 'deny').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rule name, zone, IP, application..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase font-mono">
              <tr>
                <th className="py-2.5 px-4 border-b border-slate-800">Rule Name</th>
                <th className="py-2.5 px-4 border-b border-slate-800">From / To Zone</th>
                <th className="py-2.5 px-4 border-b border-slate-800">Source / Destination</th>
                <th className="py-2.5 px-4 border-b border-slate-800">Application</th>
                <th className="py-2.5 px-4 border-b border-slate-800">Service</th>
                <th className="py-2.5 px-4 border-b border-slate-800">Action</th>
                <th className="py-2.5 px-4 border-b border-slate-800">Security Profiles</th>
                <th className="py-2.5 px-4 border-b border-slate-800">Log End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {filteredRules.map((rule) => {
                const isAnyAny =
                  rule.action === 'allow' &&
                  rule.sources.includes('any') &&
                  rule.destinations.includes('any') &&
                  rule.applications.includes('any') &&
                  rule.services.includes('any');

                const hasThreatProfile = Boolean(rule.profileSetting?.group || rule.profileSetting?.virus);

                return (
                  <tr
                    key={rule.id}
                    onClick={() => setSelectedRule(rule)}
                    className={`hover:bg-slate-800/50 cursor-pointer ${isAnyAny ? 'bg-rose-950/20' : ''}`}
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-200">
                      <div>{rule.name}</div>
                      {isAnyAny && (
                        <span className="text-[10px] text-rose-400 font-sans font-semibold">
                          ⚠️ ANY-ANY PERMIT
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      <div>From: {rule.fromZones.join(', ')}</div>
                      <div className="text-slate-400">To: {rule.toZones.join(', ')}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      <div>Src: {rule.sources.join(', ')}</div>
                      <div className="text-slate-400">Dst: {rule.destinations.join(', ')}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      {rule.applications.includes('any') ? (
                        <span className="text-amber-400 font-bold">any</span>
                      ) : (
                        <span className="text-cyan-400">{rule.applications.join(', ')}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {rule.services.includes('any') ? (
                        <span className="text-rose-400 font-bold">any</span>
                      ) : (
                        <span>{rule.services.join(', ')}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        rule.action === 'allow' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {hasThreatProfile ? (
                        <span className="text-emerald-400 font-sans text-xs flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Protected</span>
                        </span>
                      ) : rule.action === 'allow' ? (
                        <span className="text-amber-400 font-sans text-xs">Unprotected</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {rule.logEnd ? (
                        <span className="text-emerald-400">Yes</span>
                      ) : (
                        <span className="text-rose-400 font-bold">NO</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Rule Drawer / Modal */}
      {selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-xs text-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Rule Details: "{selectedRule.name}"</h3>
                <span className="text-slate-400 font-mono text-[11px]">Action: {selectedRule.action}</span>
              </div>
              <button
                onClick={() => setSelectedRule(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">From Zones:</div>
                  <div className="text-cyan-400">{selectedRule.fromZones.join(', ')}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">To Zones:</div>
                  <div className="text-cyan-400">{selectedRule.toZones.join(', ')}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Sources:</div>
                  <div className="text-slate-200">{selectedRule.sources.join(', ')}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Destinations:</div>
                  <div className="text-slate-200">{selectedRule.destinations.join(', ')}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Applications:</div>
                  <div className="text-emerald-400">{selectedRule.applications.join(', ')}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Services:</div>
                  <div className="text-slate-200">{selectedRule.services.join(', ')}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase mb-1">Attached Security Profiles:</div>
                {selectedRule.profileSetting ? (
                  <pre className="text-cyan-300 font-mono text-[11px]">
                    {JSON.stringify(selectedRule.profileSetting, null, 2)}
                  </pre>
                ) : (
                  <div className="text-rose-400 font-sans">No Threat Prevention Profile attached!</div>
                )}
              </div>

              {selectedRule.description && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase mb-1">Description:</div>
                  <div className="text-slate-300 font-sans">{selectedRule.description}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedRule(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
