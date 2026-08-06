'use client';

import { useState } from 'react';
import { FileDown, Calendar, TrendingUp, BarChart2, Cpu, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Status = { type: 'idle' | 'loading' | 'success' | 'error'; message?: string };

const PRESETS = [
  { label: 'Last 7 days',   days: 7 },
  { label: 'Last 30 days',  days: 30 },
  { label: 'Last 3 months', days: 90 },
] as const;

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function dateMinusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return isoDate(d);
}

function firstOfMonth(offset = 0) {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth() + offset, 1));
}

function lastOfMonth(offset = 0) {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth() + offset + 1, 0));
}

export default function ReportDownloadClient() {
  const [from, setFrom] = useState(dateMinusDays(30));
  const [to,   setTo]   = useState(isoDate(new Date()));
  const [activePreset, setActivePreset] = useState<string>('Last 30 days');
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  function applyPreset(label: string, days?: number, fromVal?: string, toVal?: string) {
    setActivePreset(label);
    if (days !== undefined) {
      setFrom(dateMinusDays(days));
      setTo(isoDate(new Date()));
    } else {
      setFrom(fromVal!);
      setTo(toVal!);
    }
  }

  async function downloadReport() {
    if (!from || !to) { setStatus({ type: 'error', message: 'Select both a start and end date.' }); return; }
    if (from > to)    { setStatus({ type: 'error', message: '"From" date must be on or before "To" date.' }); return; }

    setStatus({ type: 'loading', message: 'Generating report — this may take a few seconds…' });
    try {
      const res = await fetch(`/api/analytics/report/download?from=${from}&to=${to}`);
      if (res.status === 401 || res.status === 403) {
        setStatus({ type: 'error', message: 'Access denied. Admin role required.' });
        return;
      }
      if (!res.ok) {
        setStatus({ type: 'error', message: `Server error ${res.status}. Please try again.` });
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const disp = res.headers.get('Content-Disposition') ?? '';
      const filename = disp.match(/filename="([^"]+)"/)?.[1]
        ?? `BenchReadiness_Report_${from}_to_${to}.pdf`;
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: `Downloaded: ${filename}` });
    } catch (e) {
      setStatus({ type: 'error', message: `Download failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Date range card */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          Select Report Period
        </h2>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mb-5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.label, p.days)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activePreset === p.label
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => applyPreset('This month', undefined, firstOfMonth(), isoDate(new Date()))}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activePreset === 'This month'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700'
            }`}
          >
            This month
          </button>
          <button
            onClick={() => applyPreset('Last month', undefined, firstOfMonth(-1), lastOfMonth(-1))}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activePreset === 'Last month'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700'
            }`}
          >
            Last month
          </button>
        </div>

        {/* Date pickers */}
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={e => { setFrom(e.target.value); setActivePreset(''); }}
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={isoDate(new Date())}
              onChange={e => { setTo(e.target.value); setActivePreset(''); }}
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={downloadReport}
            disabled={status.type === 'loading'}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {status.type === 'loading'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />}
            {status.type === 'loading' ? 'Generating…' : 'Download PDF'}
          </button>
        </div>

        {/* Status message */}
        {status.type !== 'idle' && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            status.type === 'loading' ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
            : status.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}>
            {status.type === 'loading' && <Loader2 className="h-4 w-4 animate-spin mt-0.5 shrink-0" />}
            {status.type === 'success' && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            {status.type === 'error'   && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            <span>{status.message}</span>
          </div>
        )}
      </div>

      {/* What's inside */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">What&apos;s in the report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: BarChart2, label: 'Executive Summary', desc: 'Total interviews, attendance rate, ready rate' },
            { icon: TrendingUp, label: 'Pipeline Status', desc: 'Draft → Scheduled → Completed → Signed Off' },
            { icon: CheckCircle, label: 'Assessment Verdicts', desc: 'READY / NEEDS_PREP / RESKILLING / MISMATCH with %' },
            { icon: Calendar, label: 'Mode Distribution', desc: 'SCREENING / L1 / L2 / L3 / L4 breakdown' },
            { icon: TrendingUp, label: 'Activity Trend', desc: 'Daily or weekly table for the selected period' },
            { icon: Cpu, label: 'AI Token Analytics', desc: 'Daily usage, avg per interview, cost breakdown' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <Icon className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        All data is scoped to the selected date range based on interview creation date.
        Token usage is also filtered to the same period.
        Requires <strong className="text-zinc-500">Admin</strong> access.{' '}
        <Link href="/admin" className="text-blue-500 hover:underline">← Back to Dashboard</Link>
      </p>
    </div>
  );
}
