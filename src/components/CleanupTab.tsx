import React, { useState } from 'react';
import { UnusedCleanupSummary } from '../types/panos';
import { Trash2, Copy, Check, Download, AlertTriangle, Layers, Search, Terminal } from 'lucide-react';

interface CleanupTabProps {
  cleanupSummary: UnusedCleanupSummary;
  hostname: string;
}

export const CleanupTab: React.FC<CleanupTabProps> = ({ cleanupSummary, hostname }) => {
  const [activeSubTab, setActiveSubTab] = useState<'unused-addresses' | 'unused-services' | 'shadow-rules' | 'permissive-rules' | 'cli-script'>('unused-addresses');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cleanupSummary.cleanupCliCommands.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCli = () => {
    const blob = new Blob([cleanupSummary.cleanupCliCommands.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panos-cleanup-${hostname}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const filteredAddresses = cleanupSummary.unusedAddressObjects.filter(
    (a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           a.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Stat Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Unreferenced Address Objects</div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-1">{cleanupSummary.unusedAddressObjects.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            out of {cleanupSummary.totalAddressObjects} total ({Math.round((cleanupSummary.unusedAddressObjects.length / Math.max(1, cleanupSummary.totalAddressObjects)) * 100)}% bloat)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Unused Service Objects</div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-1">{cleanupSummary.unusedServiceObjects.length}</div>
          <div className="text-xs text-slate-400 mt-1">out of {cleanupSummary.totalServiceObjects} total services</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-rose-400 font-medium">Shadow / Redundant Rules</div>
          <div className="text-3xl font-bold font-mono text-rose-400 mt-1">{cleanupSummary.shadowRules.length}</div>
          <div className="text-xs text-slate-400 mt-1">0 hit count, shadowed by earlier rules</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-indigo-400 font-medium">Permissive / Unlogged Rules</div>
          <div className="text-3xl font-bold font-mono text-indigo-400 mt-1">{cleanupSummary.overlyPermissiveRules.length}</div>
          <div className="text-xs text-slate-400 mt-1">High-risk scope or missing audit logs</div>
        </div>
      </div>

      {/* Sub navigation bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('unused-addresses')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'unused-addresses' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unused Addresses ({cleanupSummary.unusedAddressObjects.length})
          </button>

          <button
            onClick={() => setActiveSubTab('unused-services')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'unused-services' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unused Services ({cleanupSummary.unusedServiceObjects.length})
          </button>

          <button
            onClick={() => setActiveSubTab('shadow-rules')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'shadow-rules' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Shadow Rules ({cleanupSummary.shadowRules.length})
          </button>

          <button
            onClick={() => setActiveSubTab('permissive-rules')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'permissive-rules' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Permissive Rules ({cleanupSummary.overlyPermissiveRules.length})
          </button>

          <button
            onClick={() => setActiveSubTab('cli-script')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeSubTab === 'cli-script' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3 w-3" />
            <span>Remediation CLI Script</span>
          </button>
        </div>

        {activeSubTab === 'unused-addresses' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address name or IP..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      {/* Content Panels */}
      {activeSubTab === 'unused-addresses' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Unreferenced Address Objects</h3>
              <p className="text-xs text-slate-400">
                These objects exist in the XML configuration database but are not referenced in any security policy, NAT rule, decryption rule, or group.
              </p>
            </div>
            <button
              onClick={handleCopyCli}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>Copy Delete CLI Commands</span>
            </button>
          </div>

          {filteredAddresses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No unused address objects matching your criteria. Configuration is lean.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase font-mono">
                  <tr>
                    <th className="py-2.5 px-4 border-b border-slate-800">Object Name</th>
                    <th className="py-2.5 px-4 border-b border-slate-800">Type</th>
                    <th className="py-2.5 px-4 border-b border-slate-800">IP / Netmask / FQDN Value</th>
                    <th className="py-2.5 px-4 border-b border-slate-800">Description / History</th>
                    <th className="py-2.5 px-4 border-b border-slate-800 text-right">CLI Delete Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11.5px]">
                  {filteredAddresses.map((obj) => (
                    <tr key={obj.name} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-slate-200">{obj.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{obj.type}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-medium">{obj.value}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">{obj.description || '—'}</td>
                      <td className="py-2.5 px-4 text-right text-rose-400 font-mono text-xs">
                        delete address "{obj.name}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'unused-services' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Unreferenced Custom Service Objects</h3>
            <p className="text-xs text-slate-400">
              Custom TCP/UDP port objects defined in configuration that are not attached to any active rule.
            </p>
          </div>

          {cleanupSummary.unusedServiceObjects.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No unused service objects detected.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase font-mono">
                  <tr>
                    <th className="py-2.5 px-4 border-b border-slate-800">Service Name</th>
                    <th className="py-2.5 px-4 border-b border-slate-800">Protocol</th>
                    <th className="py-2.5 px-4 border-b border-slate-800">Port</th>
                    <th className="py-2.5 px-4 border-b border-slate-800">Description</th>
                    <th className="py-2.5 px-4 border-b border-slate-800 text-right">CLI Delete Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11.5px]">
                  {cleanupSummary.unusedServiceObjects.map((srv) => (
                    <tr key={srv.name} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-slate-200">{srv.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400 uppercase">{srv.protocol}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-medium">{srv.port}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">{srv.description || '—'}</td>
                      <td className="py-2.5 px-4 text-right text-rose-400 font-mono text-xs">
                        delete service "{srv.name}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'shadow-rules' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-bold text-white mb-1">Shadowed & Redundant Security Rules</h3>
          <p className="text-xs text-slate-400 mb-4">
            A rule is shadowed when an earlier rule in the rulebase matches all of its traffic criteria with the same or broader action. Shadowed rules never increment hit count and clutter administrative audits.
          </p>

          {cleanupSummary.shadowRules.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-400 bg-slate-950 rounded-lg border border-slate-800">
              No shadow rules identified. Rule evaluation ordering is optimized.
            </div>
          ) : (
            <div className="space-y-3">
              {cleanupSummary.shadowRules.map((shadow, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-rose-900/30 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-rose-400 font-mono">
                      Rule: "{shadow.ruleName}"
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Shadowed by: <strong className="text-cyan-400">"{shadow.shadowedByRule}"</strong>
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-3">
                    {shadow.reason}
                  </p>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
                    <span>delete rulebase security rules "{shadow.ruleName}"</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(`delete rulebase security rules "${shadow.ruleName}"`)}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-sans"
                    >
                      Copy Command
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'permissive-rules' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-bold text-white mb-1">Overly Permissive or Unlogged Security Rules</h3>
          <p className="text-xs text-slate-400 mb-4">
            Rules allowing "any-any", broad port ranges, or failing to log session completions.
          </p>

          <div className="space-y-3">
            {cleanupSummary.overlyPermissiveRules.map((rule, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white font-mono">"{rule.ruleName}"</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    rule.risk === 'High' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {rule.risk} Risk
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{rule.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'cli-script' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white">PAN-OS CLI Remediation & Cleanup Script</h3>
              <p className="text-xs text-slate-400">
                Execute directly in PAN-OS CLI configure mode to safely prune orphaned objects and delete shadow rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCli}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy All Commands'}</span>
              </button>
              <button
                onClick={handleDownloadCli}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto max-h-[500px] leading-relaxed">
            {cleanupSummary.cleanupCliCommands.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
};
