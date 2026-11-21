import React from 'react';
import { AuditReportData } from '../types/panos';
import { DISCLAIMER_TEXT, DISCLAIMER_INDEPENDENT } from './Disclaimer';

/**
 * Print-only title page and closing page that wrap the 3-page report when it
 * is printed or saved as PDF. Hidden on screen via the .print-only class.
 */

// Relative to index.html (Vite base is './'), so it works on GitHub Pages and inside the WordPress iframe
const LOGO_SRC = './packet-shed-emblem.png';

export const SITE_LINKS = [
  { label: 'Website', url: 'https://thepacketshed.com' },
  { label: 'Free tools', url: 'https://thepacketshed.com/tools/' },
  { label: 'This auditor', url: 'https://thepacketshed.com/panos-tsf-auditor/' },
  { label: 'YouTube', url: 'https://www.youtube.com/@ThePacketShed' },
];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const Brand: React.FC<{ size?: 'lg' | 'sm' }> = ({ size = 'lg' }) => (
  <div className="flex items-center gap-4">
    <img
      src={LOGO_SRC}
      alt="The Packet Shed logo"
      className={size === 'lg' ? 'h-24 w-24 rounded-full' : 'h-14 w-14 rounded-full'}
    />
    <div>
      <div className={`font-bold text-slate-900 ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>The Packet Shed</div>
      <div className={`font-mono text-slate-500 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>Decapsulating Certs &amp; Analyzing Tech.</div>
    </div>
  </div>
);

interface BookendProps {
  reportData: AuditReportData;
  managementLabel: string;
}

export const ReportCoverPage: React.FC<BookendProps> = ({ reportData, managementLabel }) => {
  const { config, overallScore, riskTier, nistCompliancePercentage, zeroTrustOverallScore } = reportData;
  const m = config.metadata;
  const rows: [string, string][] = [
    ['Device', m.hostname],
    ['Model', m.model],
    ['Serial', m.serial],
    ['PAN-OS', m.panOsVersion],
    ['Management', managementLabel],
    ['Source file', config.sourceFileName],
    ['Report date', formatDate(config.parsedAt)],
  ];

  return (
    <section className="print-only report-cover">
      <div className="flex flex-col h-full">
        <div className="h-2 w-full bg-[#f97316]" />
        <div className="pt-10">
          <Brand />
        </div>

        <div className="mt-20">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#0e7490]">Configuration Audit Report</div>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-900">
            PAN-OS Technical Support File Audit
          </h1>
          <p className="mt-3 text-base text-slate-600">
            NIST SP 800-53 · Zero Trust (NIST SP 800-207) · Object Hygiene · PAN-OS Advisories
          </p>
        </div>

        <table className="mt-12 w-full max-w-xl text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-200">
                <td className="py-2 pr-6 text-slate-500 w-36">{k}</td>
                <td className="py-2 font-mono text-slate-900 break-all">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex gap-4 text-sm">
          <div className="px-4 py-3 rounded border border-slate-300">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Overall posture</div>
            <div className="font-bold text-slate-900">{riskTier} · {overallScore}/100</div>
          </div>
          <div className="px-4 py-3 rounded border border-slate-300">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">NIST 800-53</div>
            <div className="font-bold text-slate-900">{nistCompliancePercentage}%</div>
          </div>
          <div className="px-4 py-3 rounded border border-slate-300">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Zero Trust</div>
            <div className="font-bold text-slate-900">{zeroTrustOverallScore}/100</div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="p-4 rounded border border-amber-300 bg-amber-50 text-[11px] leading-relaxed text-slate-800">
            <div className="font-bold uppercase tracking-wider text-amber-800 text-[10px] mb-1">Disclaimer</div>
            <p>{DISCLAIMER_TEXT}</p>
            <p className="mt-1 text-slate-600">{DISCLAIMER_INDEPENDENT}</p>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-mono text-slate-500">
            <span>thepacketshed.com</span>
            <span>Generated client-side · no configuration data left the browser</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export const ReportClosingPage: React.FC<BookendProps> = ({ reportData }) => {
  const { config } = reportData;
  return (
    <section className="print-only report-closing">
      <div className="flex flex-col h-full">
        <div className="h-2 w-full bg-[#f97316]" />
        <div className="pt-10">
          <Brand size="sm" />
        </div>

        <div className="mt-12 max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900">About The Packet Shed</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            The Packet Shed is an independent website and YouTube channel run by a network security engineer
            who works hands-on with Palo Alto Networks NGFW, Panorama and Strata Cloud Manager. It shares
            practical guides, lab walkthroughs and study help for engineers, administrators and anyone working
            towards a Palo Alto Networks certification.
          </p>

          <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-slate-900">What you&apos;ll find</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
            <li>Step-by-step guides on Strata Cloud Manager, Panorama and PAN-OS operations</li>
            <li>Free browser-based tools — this TSF Auditor, a Panorama-to-SCM Readiness Check, an Upgrade Path Analyzer and an HA Upgrade CAB Template</li>
            <li>Certification study notes and exam preparation advice</li>
            <li>Video walkthroughs on the YouTube channel</li>
          </ul>

          <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-slate-900">Find us online</h3>
          <table className="mt-2 text-sm">
            <tbody>
              {SITE_LINKS.map((l) => (
                <tr key={l.url}>
                  <td className="py-1 pr-6 text-slate-500">{l.label}</td>
                  <td className="py-1 font-mono">
                    <a href={l.url} className="text-[#0e7490] underline">{l.url}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-slate-700">
            If this report was useful, subscribe on YouTube for new videos and walkthroughs.
          </p>
        </div>

        <div className="mt-auto">
          <div className="p-4 rounded border border-amber-300 bg-amber-50 text-[11px] leading-relaxed text-slate-800">
            <div className="font-bold uppercase tracking-wider text-amber-800 text-[10px] mb-1">Disclaimer</div>
            <p>{DISCLAIMER_TEXT}</p>
            <p className="mt-1 text-slate-600">{DISCLAIMER_INDEPENDENT}</p>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-mono text-slate-500">
            <span>Report for {config.metadata.hostname}</span>
            <span>End of report</span>
          </div>
        </div>
      </div>
    </section>
  );
};
