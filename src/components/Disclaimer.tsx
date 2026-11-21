import React from 'react';
import { Info } from 'lucide-react';

export const DISCLAIMER_SHORT = 'Demonstration only · Not official advice';

export const DISCLAIMER_TEXT =
  'This report does not constitute official advice and is provided for demonstration purposes only. ' +
  'Findings are generated automatically from a single configuration snapshot and may be incomplete or inaccurate. ' +
  'Validate everything against official Palo Alto Networks documentation and your own change-control process before acting on it.';

export const DISCLAIMER_INDEPENDENT =
  'This is an independent community project by The Packet Shed. It is not an official Palo Alto Networks tool, and views expressed are the author’s own.';

interface DisclaimerProps {
  /** banner: on-screen, near the upload box. report: print-friendly box inside the report. */
  variant?: 'banner' | 'report';
  className?: string;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ variant = 'banner', className = '' }) => {
  if (variant === 'report') {
    return (
      <div
        role="note"
        className={`p-3 rounded-lg border border-amber-800/60 bg-amber-950/20 text-[11px] leading-relaxed text-amber-100/90 print:bg-amber-50 print:border-amber-300 print:text-slate-800 ${className}`}
      >
        <div className="font-bold uppercase tracking-wider text-amber-300 print:text-amber-800 text-[10px] mb-1">Disclaimer</div>
        <p>{DISCLAIMER_TEXT}</p>
        <p className="mt-1 text-amber-100/70 print:text-slate-600">{DISCLAIMER_INDEPENDENT}</p>
      </div>
    );
  }

  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 p-3 rounded-lg border border-amber-800/50 bg-amber-950/20 text-xs leading-relaxed text-amber-100/90 text-left ${className}`}
    >
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
      <div>
        <strong className="text-amber-300">Disclaimer:</strong> {DISCLAIMER_TEXT}{' '}
        <span className="text-amber-100/70">{DISCLAIMER_INDEPENDENT}</span>
      </div>
    </div>
  );
};
