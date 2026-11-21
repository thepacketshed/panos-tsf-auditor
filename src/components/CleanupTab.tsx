import React, { useState } from 'react';
import { UnusedCleanupSummary, PanOsConfig, ManagementMode } from '../types/panos';
import { CleanupPlaybook, PlaybookOptions, MANAGEMENT_LABELS } from '../services/cleanupPlaybook';
import { copyText } from '../utils/clipboard';
import { Copy, Check, Download, AlertTriangle, Search, Terminal, Server, Cloud, Network, Shield, ListChecks, X } from 'lucide-react';

interface CleanupTabProps {
  cleanupSummary: UnusedCleanupSummary;
  hostname: string;
  config: PanOsConfig;
  playbook: CleanupPlaybook;
  mode: ManagementMode;
  detectedMode: ManagementMode;
  onModeChange: (mode: ManagementMode) => void;
  options: PlaybookOptions;
  onOptionsChange: (opts: PlaybookOptions) => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

/** Copy button with visible success / failure feedback */
const CopyButton: React.FC<{ text: string; label: string; copiedLabel?: string; variant?: 'primary' | 'secondary' | 'link' }> = ({
  text,
  label,
  copiedLabel = 'Copied',
  variant = 'secondary',
}) => {
  const [state, setState] = useState<CopyState>('idle');
  const onClick = async () => {
    const ok = await copyText(text);
    setState(ok ? 'copied' : 'failed');
    setTimeout(() => setState('idle'), 2200);
  };
  const base =
    variant === 'primary'
      ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors'
      : variant === 'link'
      ? 'flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-[11px] font-sans shrink-0'
      : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors';
  return (
    <button type="button" onClick={onClick} className={base} aria-live="polite">
      {state === 'copied' ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : state === 'failed' ? (
        <X className="h-3.5 w-3.5 text-rose-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span>{state === 'copied' ? copiedLabel : state === 'failed' ? 'Copy blocked — use Download' : label}</span>
    </button>
  );
};

const MODE_ICONS: Record<ManagementMode, React.ReactNode> = {
  standalone: <Shield className="h-4 w-4" />,
  'panorama-managed': <Network className="h-4 w-4" />,
  panorama: <Server className="h-4 w-4" />,
  'scm-managed': <Cloud className="h-4 w-4" />,
};

const MODE_SHORT: Record<ManagementMode, string> = {
  standalone: 'Standalone',
  'panorama-managed': 'Managed by Panorama',
  panorama: 'Panorama',
  'scm-managed': 'Managed by SCM',
};

export const CleanupTab: React.FC<CleanupTabProps> = ({
  cleanupSummary,
  hostname,
  config,
  playbook,
  mode,
  detectedMode,
  onModeChange,
  options,
  onOptionsChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'unused-addresses' | 'unused-services' | 'shadow-rules' | 'permissive-rules' | 'cli-script'>('unused-addresses');
  const [searchQuery, setSearchQuery] = useState('');

  const detection = config.metadata.management;
  const scriptText = playbook.script.join('\n');

  const handleDownloadScript = () => {
    const blob = new Blob([scriptText + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleanup-${mode}-${hostname}.${playbook.scriptFileExt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filteredAddresses = cleanupSummary.unusedAddressObjects.filter(
    (a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           a.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isCli = playbook.scriptLanguage !== 'Bash (SCM Config API)';
  const actionHeader = isCli ? `${playbook.scriptLanguage} Command` : 'Where to Remediate';
  const locationLabel = (loc?: { scope: string; name?: string }) =>
    !loc || loc.scope === 'local' ? '—' : loc.scope === 'shared' ? 'Shared' : `${loc.scope === 'vsys' ? 'vsys' : 'DG'}: ${loc.name}`;
  const showLocation = [...cleanupSummary.unusedAddressObjects, ...cleanupSummary.unusedServiceObjects].some(
    (o) => o.location && o.location.scope !== 'local'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Management context */}
      <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">How is this device managed?</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-white">
              <span className="text-cyan-400">{MODE_ICONS[mode]}</span>
              <span>{MANAGEMENT_LABELS[mode]}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {mode === detectedMode ? (
                <>
                  Auto-detected
                  {detection ? ` (${detection.confidence} confidence)` : ''}
                  {detection?.evidence?.length ? `: ${detection.evidence.join('; ')}.` : '.'} Change it if this isn&apos;t right — the recommendations follow your choice.
                </>
              ) : (
                <>
                  Set manually. Auto-detected was <strong className="text-slate-300">{MODE_SHORT[detectedMode]}</strong>.{' '}
                  <button type="button" className="text-cyan-400 hover:text-cyan-300 underline" onClick={() => onModeChange(detectedMode)}>
                    Reset
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800 shrink-0" role="radiogroup" aria-label="Management mode">
            {(Object.keys(MODE_SHORT) as ManagementMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => onModeChange(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === m ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {MODE_ICONS[m]}
                <span>{MODE_SHORT[m]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode-specific inputs */}
        {(mode === 'panorama-managed' || mode === 'panorama') && (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-xs text-slate-400">
              <span className="block mb-1">{mode === 'panorama' ? 'Default device group (for items without a location)' : 'Panorama device group for this firewall'}</span>
              <input
                type="text"
                list="tsf-dg-list"
                value={options.deviceGroup ?? config.metadata.deviceGroups?.[0] ?? ''}
                onChange={(e) => onOptionsChange({ ...options, deviceGroup: e.target.value })}
                placeholder="e.g. DG-Branches"
                className="w-64 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <datalist id="tsf-dg-list">
                {(config.metadata.deviceGroups || []).map((dg) => (
                  <option key={dg} value={dg} />
                ))}
              </datalist>
            </label>
            {mode === 'panorama-managed' && (
              <label className="flex items-center gap-2 text-xs text-slate-300 pb-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(options.objectsInShared)}
                  onChange={(e) => onOptionsChange({ ...options, objectsInShared: e.target.checked })}
                  className="accent-cyan-500"
                />
                Objects are defined in Shared
              </label>
            )}
          </div>
        )}

        {mode === 'scm-managed' && (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-xs text-slate-400">
              <span className="block mb-1">Scope type</span>
              <select
                value={options.scmScopeType || 'folder'}
                onChange={(e) => onOptionsChange({ ...options, scmScopeType: e.target.value as 'folder' | 'snippet' })}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="folder">Folder</option>
                <option value="snippet">Snippet</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              <span className="block mb-1">SCM {options.scmScopeType === 'snippet' ? 'snippet' : 'folder'} name</span>
              <input
                type="text"
                value={options.scmScope ?? ''}
                onChange={(e) => onOptionsChange({ ...options, scmScope: e.target.value })}
                placeholder={options.scmScopeType === 'snippet' ? 'e.g. Branch-Baseline' : 'e.g. Branch-Firewalls'}
                className="w-64 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </label>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-cyan-900/40 text-xs">
          <div className="font-semibold text-cyan-300">{playbook.headline}</div>
          <p className="text-slate-300 mt-0.5 leading-relaxed">{playbook.summary}</p>
          <button
            type="button"
            onClick={() => setActiveSubTab('cli-script')}
            className="mt-2 inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <ListChecks className="h-3.5 w-3.5" /> View step-by-step remediation plan
          </button>
        </div>
      </div>

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
          <div className="text-xs text-slate-400 mt-1">Fully covered by an earlier rule</div>
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
          {([
            ['unused-addresses', `Unused Addresses (${cleanupSummary.unusedAddressObjects.length})`],
            ['unused-services', `Unused Services (${cleanupSummary.unusedServiceObjects.length})`],
            ['shadow-rules', `Shadow Rules (${cleanupSummary.shadowRules.length})`],
            ['permissive-rules', `Permissive Rules (${cleanupSummary.overlyPermissiveRules.length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSubTab(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeSubTab === key ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setActiveSubTab('cli-script')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeSubTab === 'cli-script' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3 w-3" />
            <span>Remediation Plan</span>
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
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Unreferenced Address Objects</h3>
              <p className="text-xs text-slate-400">
                Not referenced by any rule, NAT policy, group or other config element found in this file.
              </p>
            </div>
            <CopyButton text={scriptText} label={isCli ? 'Copy Full Cleanup Script' : 'Copy SCM API Script'} copiedLabel="Copied to clipboard" />
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
                    {showLocation && <th className="py-2.5 px-4 border-b border-slate-800">Location</th>}
                    <th className="py-2.5 px-4 border-b border-slate-800">Description</th>
                    <th className="py-2.5 px-4 border-b border-slate-800 text-right">{actionHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11.5px]">
                  {filteredAddresses.map((obj) => (
                    <tr key={`${obj.location?.name || ''}/${obj.name}`} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-slate-200">{obj.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{obj.type}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-medium">{obj.value}</td>
                      {showLocation && <td className="py-2.5 px-4 text-slate-400">{locationLabel(obj.location)}</td>}
                      <td className="py-2.5 px-4 font-sans text-slate-400">{obj.description || '—'}</td>
                      <td className="py-2.5 px-4 text-right text-rose-400 font-mono text-xs">
                        {playbook.itemAction('address', obj.name, obj.location)}
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
                    {showLocation && <th className="py-2.5 px-4 border-b border-slate-800">Location</th>}
                    <th className="py-2.5 px-4 border-b border-slate-800">Description</th>
                    <th className="py-2.5 px-4 border-b border-slate-800 text-right">{actionHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11.5px]">
                  {cleanupSummary.unusedServiceObjects.map((srv) => (
                    <tr key={`${srv.location?.name || ''}/${srv.name}`} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-slate-200">{srv.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400 uppercase">{srv.protocol}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-medium">{srv.port}</td>
                      {showLocation && <td className="py-2.5 px-4 text-slate-400">{locationLabel(srv.location)}</td>}
                      <td className="py-2.5 px-4 font-sans text-slate-400">{srv.description || '—'}</td>
                      <td className="py-2.5 px-4 text-right text-rose-400 font-mono text-xs">
                        {playbook.itemAction('service', srv.name, srv.location)}
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
            A rule is shadowed when an earlier rule matches all of its traffic criteria with the same action. Confirm zero hit counts before removing.
            {mode === 'scm-managed' && ' In Strata Cloud Manager, confirm with Policy Analyzer.'}
          </p>

          {cleanupSummary.shadowRules.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-400 bg-slate-950 rounded-lg border border-slate-800">
              No shadow rules identified. Rule evaluation ordering is optimized.
            </div>
          ) : (
            <div className="space-y-3">
              {cleanupSummary.shadowRules.map((shadow, idx) => {
                const action = playbook.itemAction('rule', shadow.ruleName);
                return (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-rose-900/30 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-rose-400 font-mono">Rule: "{shadow.ruleName}"</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Shadowed by: <strong className="text-cyan-400">"{shadow.shadowedByRule}"</strong>
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-3">{shadow.reason}</p>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between gap-3">
                      <span className="break-all">{action}</span>
                      {isCli && <CopyButton text={action} label="Copy Command" variant="link" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'permissive-rules' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-bold text-white mb-1">Overly Permissive or Unlogged Security Rules</h3>
          <p className="text-xs text-slate-400 mb-4">
            Rules allowing "any-any", broad port ranges, or failing to log session completions.{' '}
            {mode === 'standalone' && 'Tighten these on the firewall.'}
            {mode === 'panorama-managed' && 'Tighten these in the Panorama device group, then push — local edits would be overwritten.'}
            {mode === 'panorama' && 'Tighten these in the device group (or Shared) where each rule is defined, then push.'}
            {mode === 'scm-managed' && 'Tighten these in Strata Cloud Manager (Security Policy in the right folder or snippet), then push.'}
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
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              {MODE_ICONS[mode]} {MANAGEMENT_LABELS[mode]}
            </div>
            <h3 className="text-sm font-bold text-white mt-1">{playbook.headline}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{playbook.summary}</p>

            <ol className="mt-4 space-y-3">
              {playbook.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 text-[11px] font-bold font-mono">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100">{step.title}</div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.detail}</p>
                    {step.commands && step.commands.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 flex items-start justify-between gap-3">
                        <pre className="whitespace-pre-wrap break-all">{step.commands.join('\n')}</pre>
                        <CopyButton text={step.commands.join('\n')} label="Copy" variant="link" />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {playbook.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-2">
                <AlertTriangle className="h-4 w-4" /> Before you delete anything
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-amber-100/80 leading-relaxed">
                {playbook.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{playbook.scriptTitle}</h3>
                <p className="text-xs text-slate-400">Language: {playbook.scriptLanguage}</p>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={scriptText} label="Copy All" copiedLabel="Copied to Clipboard" variant="primary" />
                <button
                  type="button"
                  onClick={handleDownloadScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .{playbook.scriptFileExt}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto max-h-[500px] leading-relaxed">
              {scriptText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
