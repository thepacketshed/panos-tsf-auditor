import React from 'react';
import { Shield, Printer, RefreshCw, FileText, CheckCircle2, AlertTriangle, Layers, Trash2, Cpu, Search } from 'lucide-react';
import { PanOsConfig } from '../types/panos';

interface HeaderProps {
  config: PanOsConfig;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onPrint: () => void;
  onReset: () => void;
  onLoadSample: (sampleKey: 'pa3260' | 'panorama' | 'pa5450') => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeTab,
  setActiveTab,
  onPrint,
  onReset,
  onLoadSample,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="flex items-center justify-between gap-8 px-6 py-3">
        {/* Zone 1: Brand title, single line */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              PAN-OS TSF Auditor
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
              <span>{config.metadata.hostname}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{config.metadata.model}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-cyan-400">PAN-OS {config.metadata.panOsVersion}</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'report'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>3-Page Executive Report</span>
          </button>

          <button
            onClick={() => setActiveTab('nist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'nist'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>NIST 800-53</span>
          </button>

          <button
            onClick={() => setActiveTab('zerotrust')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'zerotrust'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Zero Trust Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('cleanup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'cleanup'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Object Hygiene & CLI</span>
          </button>

          <button
            onClick={() => setActiveTab('advisories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'advisories'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Advisories & Reddit Bugs</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Rules Explorer</span>
          </button>
        </nav>

        {/* Zone 3: Actions (Print 3-Page PDF & Samples) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              <span>Switch Sample</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 z-50 text-xs">
              <button
                onClick={() => onLoadSample('pa3260')}
                className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 text-slate-200 flex flex-col gap-0.5"
              >
                <span className="font-semibold text-rose-400">PA-3260 (PAN-OS 10.2.8)</span>
                <span className="text-[11px] text-slate-400">Critical CVE-2024-3400 & 42 Unused Objects</span>
              </button>
              <button
                onClick={() => onLoadSample('panorama')}
                className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 text-slate-200 flex flex-col gap-0.5"
              >
                <span className="font-semibold text-amber-400">Panorama M-600 (PAN-OS 11.0.3)</span>
                <span className="text-[11px] text-slate-400">Shared Device-Groups & Missing MFA</span>
              </button>
              <button
                onClick={() => onLoadSample('pa5450')}
                className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 text-slate-200 flex flex-col gap-0.5"
              >
                <span className="font-semibold text-emerald-400">PA-5450 Data Center (PAN-OS 11.1.2)</span>
                <span className="text-[11px] text-slate-400">Hardened ZTA, Reddit DP Buffer Bug</span>
              </button>
            </div>
          </div>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            title="Export or print strictly formatted 3-page executive compliance document"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print 3-Page Report</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Upload different TSF or config file"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
