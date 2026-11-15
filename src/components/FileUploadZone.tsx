import React, { useState, useRef } from 'react';
import { Upload, FileArchive, ShieldAlert, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onLoadSample: (sampleKey: 'pa3260' | 'panorama' | 'pa5450') => void;
  isProcessing: boolean;
  statusMessage?: string;
  errorMessage?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  onLoadSample,
  isProcessing,
  statusMessage,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Intro */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-xs font-medium mb-3">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>NIST SP 800-53 Rev 5 · Zero Trust NIST 800-207 · PAN-OS Advisories</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          Palo Alto & Panorama Technical Support File Auditor
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Upload a firewall or Panorama Tech Support File (TSF). The analyzer automatically extracts the merged managed configuration, validates compliance against NIST 800-53 controls, audits Zero Trust architecture, identifies unused objects for hygiene cleanup, and checks against latest PAN-OS CVE advisories and Reddit community bug trackers.
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-950/30'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".tgz,.tar.gz,.gz,.zip,.xml,.txt"
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="h-10 w-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <div className="text-sm font-semibold text-slate-200">
              {statusMessage || 'Extracting & Decompressing TSF Archive...'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Parsing running-config.xml, security rulebase, and device hardening parameters
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 mb-4 group-hover:scale-105 transition-transform">
              <Upload className="h-7 w-7" />
            </div>

            <div className="text-base font-semibold text-slate-100 mb-1">
              Drop Palo Alto Tech Support File (.tgz / .tar.gz / .zip) or running-config.xml
            </div>
            <div className="text-xs text-slate-400 mb-4">
              Supports standard PAN-OS TSF archives, Panorama exported configs, and standalone XML files
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <FileArchive className="h-4 w-4" />
              <span>Browse Files on Computer</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs text-left flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* How to generate TSF guide */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-2">
        <span>How to generate: PAN-OS Web GUI &rarr; <strong>Device &gt; Support &gt; Generate Tech Support File</strong></span>
        <span>Runs 100% locally in browser (no sensitive configs sent over external networks)</span>
      </div>

      {/* Quick Load Realistic Scenarios */}
      <div className="mt-10 border-t border-slate-800/80 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Or Instant Load Pre-Packaged Enterprise TSF Scenarios:
            </h2>
            <p className="text-xs text-slate-400">
              Explore audits of real-world Palo Alto NGFW and Panorama configurations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div
            onClick={() => onLoadSample('pa3260')}
            className="border border-slate-800 hover:border-rose-500/50 bg-slate-900/60 hover:bg-slate-900 p-4 rounded-xl cursor-pointer transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                CRITICAL RISK
              </span>
              <span className="text-[11px] font-mono text-slate-400">PAN-OS 10.2.8</span>
            </div>
            <div className="font-semibold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
              PA-3260 Perimeter Edge
            </div>
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
              Vulnerable to CVE-2024-3400 (GlobalProtect) & CVE-2024-0012, 42 unused objects, mgmtsrvr memory leak, missing SSL Decryption.
            </p>
            <div className="mt-3 flex items-center text-xs font-medium text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Audit This Configuration</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => onLoadSample('panorama')}
            className="border border-slate-800 hover:border-amber-500/50 bg-slate-900/60 hover:bg-slate-900 p-4 rounded-xl cursor-pointer transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                MODERATE RISK
              </span>
              <span className="text-[11px] font-mono text-slate-400">PAN-OS 11.0.3</span>
            </div>
            <div className="font-semibold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
              Panorama M-600 Central
            </div>
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
              Multi-vsys orchestrator with shared device groups, orphaned address groups, breakglass account without MFA, 11.0 maintenance status.
            </p>
            <div className="mt-3 flex items-center text-xs font-medium text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Audit This Configuration</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => onLoadSample('pa5450')}
            className="border border-slate-800 hover:border-emerald-500/50 bg-slate-900/60 hover:bg-slate-900 p-4 rounded-xl cursor-pointer transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                HARDENED POSTURE
              </span>
              <span className="text-[11px] font-mono text-slate-400">PAN-OS 11.1.2</span>
            </div>
            <div className="font-semibold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
              PA-5450 Core Data Center
            </div>
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
              Strict ZTA App-ID, TLS 1.3, User-ID & HIP, but affected by Reddit-documented dataplane packet buffer crash bug needing 11.1.4-h1.
            </p>
            <div className="mt-3 flex items-center text-xs font-medium text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Audit This Configuration</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
