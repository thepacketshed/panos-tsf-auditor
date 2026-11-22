import React from 'react';
import { PanOsConfig } from '../types/panos';

/*
 * Title page and closing page for the printed report, matching the other
 * The Packet Shed tool reports (logo, document details, disclaimer, links).
 */

const SITE = 'https://thepacketshed.com';
const YOUTUBE = 'https://www.youtube.com/@ThePacketShed';
const LOGO = 'https://thepacketshed.com/wp-content/uploads/2025/12/cropped-thepacketshed-flow.png';

export const REPORT_DISCLAIMER =
  'Not official advice. For demonstration purposes only. This report is generated automatically from a single configuration snapshot and may be incomplete or inaccurate. ' +
  'Validate everything against official Palo Alto Networks documentation and your own change-control process before acting on it. It is not an official Palo Alto Networks tool. ' +
  'The Packet Shed is a personal project. The thoughts and opinions shared here are entirely my own and completely independent of my employer.';

const Row: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <tr className="border-b border-slate-800 print:border-slate-200">
    <th className="py-1.5 pr-4 text-left font-semibold text-slate-400 print:text-slate-500 w-48 align-top">{label}</th>
    <td className="py-1.5 font-mono text-slate-200 print:text-slate-900">
      {value ? value : <span className="italic text-slate-500 font-sans">Not recorded</span>}
    </td>
  </tr>
);

export const ReportTitlePage: React.FC<{ config: PanOsConfig }> = ({ config }) => {
  const m = config.metadata;
  const generated = new Date(config.parsedAt);
  const generatedText = isNaN(generated.getTime())
    ? config.parsedAt
    : generated.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
  return (
    <div className="report-title-page mb-8 p-6 sm:p-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-md print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print-surface">
      <img
        src={LOGO}
        alt="The Packet Shed logo"
        width={120}
        height={120}
        className="rounded-full mb-4 block"
      />
      <div className="text-[11px] uppercase font-bold tracking-[0.14em] text-cyan-400 print:text-cyan-700">
        The Packet Shed
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white print:text-slate-900 mt-1">
        PAN-OS Configuration Review: {m.hostname}
      </h1>
      <p className="text-sm text-slate-400 print:text-slate-600 mt-1 mb-6">
        {[m.model, m.panOsVersion ? `PAN-OS ${m.panOsVersion}` : '', m.isPanorama ? 'Panorama' : 'Firewall'].filter(Boolean).join('  ·  ')}
      </p>
      <table className="w-full max-w-2xl text-sm">
        <tbody>
          <Row label="Hostname" value={m.hostname} />
          <Row label="Model" value={m.model} />
          <Row label="Serial number" value={m.serial} />
          <Row label="PAN-OS version" value={m.panOsVersion} />
          <Row label="Source file" value={config.sourceFileName} />
          <Row label="Generated" value={generatedText} />
        </tbody>
      </table>
      <div className="mt-6 p-3 border-l-4 border-orange-500 bg-orange-950/30 print:bg-orange-50 text-xs leading-relaxed text-slate-300 print:text-slate-700 max-w-2xl">
        <strong>Disclaimer.</strong> {REPORT_DISCLAIMER}
      </div>
    </div>
  );
};

export const ReportClosingPage: React.FC = () => (
  <div className="report-closing-page mt-8 p-6 sm:p-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-md print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print-surface">
    <img src={LOGO} alt="" width={90} height={90} className="rounded-full mb-4 block" />
    <h2 className="text-2xl font-bold tracking-tight text-white print:text-slate-900">About The Packet Shed</h2>
    <p className="text-sm text-slate-300 print:text-slate-700 mt-3 max-w-2xl leading-relaxed">
      The Packet Shed is a free community site about network security: study guides for Palo Alto Networks
      certifications, Strata Cloud Manager walkthroughs and practical tools like this auditor. It is built by an
      engineer, for engineers.
    </p>
    <p className="text-sm text-slate-300 print:text-slate-700 mt-4 leading-loose">
      <strong>Website:</strong>{' '}
      <a href={SITE} target="_blank" rel="noopener noreferrer" className="text-cyan-400 print:text-slate-900 underline">thepacketshed.com</a>
      <br />
      <strong>Free tools:</strong>{' '}
      <a href={`${SITE}/tools/`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 print:text-slate-900 underline">thepacketshed.com/tools</a>
      <br />
      <strong>YouTube:</strong>{' '}
      <a href={YOUTUBE} target="_blank" rel="noopener noreferrer" className="text-cyan-400 print:text-slate-900 underline">youtube.com/@ThePacketShed</a>
    </p>
    <p className="text-sm text-slate-300 print:text-slate-700 mt-4">
      If this report was useful, subscribe on YouTube for new videos and walkthroughs.
    </p>
    <div className="mt-6 p-3 border-l-4 border-orange-500 bg-orange-950/30 print:bg-orange-50 text-xs leading-relaxed text-slate-300 print:text-slate-700 max-w-2xl">
      <strong>Disclaimer.</strong> {REPORT_DISCLAIMER}
    </div>
    <p className="mt-8 text-center text-xs text-slate-500">End of report</p>
  </div>
);
