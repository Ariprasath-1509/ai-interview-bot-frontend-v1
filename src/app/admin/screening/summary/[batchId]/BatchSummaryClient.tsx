'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  stage: string;
  finalStatus: 'Selected' | 'Rejected' | 'Hold' | 'In Progress';
  round1Score: number | null;
  round2Marks: number | null;
  round3Total: number | null;
  totalMarks: number | null;
}

interface Counts {
  total: number;
  selected: number;
  rejected: number;
  hold: number;
  inProgress: number;
}

const statusBadgeCls: Record<CandidateRow['finalStatus'], string> = {
  Selected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50',
  Hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  'In Progress': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
};

export function BatchSummaryClient({ batchId }: { batchId: string }) {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/screening/admin/batches/${batchId}/summary`)
      .then((r) => r.json())
      .then((data) => {
        setCandidates(data.candidates || []);
        setCounts(data.counts || null);
      })
      .finally(() => setLoading(false));
  }, [batchId]);

  const backLink = (
    <Link href="/admin/screening" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
      ← Back to Screening
    </Link>
  );

  if (loading) {
    return (
      <div>
        {backLink}
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      {backLink}

      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500">Total</p><p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{counts.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500">Selected</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{counts.selected}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500">Rejected</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{counts.rejected}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500">Hold</p><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.hold}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500">In Progress</p><p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">{counts.inProgress}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consolidated marks</CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-zinc-500">No candidates in this batch.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Round 1 (/35)</th>
                    <th className="py-2 pr-4">Round 2 (/35)</th>
                    <th className="py-2 pr-4">Round 3 (/30)</th>
                    <th className="py-2 pr-4">Total (/100)</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-2 pr-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</div>
                        <div className="text-[11px] text-zinc-400">{c.email}</div>
                      </td>
                      <td className="py-2 pr-4">{c.round1Score ?? '—'}</td>
                      <td className="py-2 pr-4">{c.round2Marks ?? '—'}</td>
                      <td className="py-2 pr-4">{c.round3Total ?? '—'}</td>
                      <td className="py-2 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">{c.totalMarks ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadgeCls[c.finalStatus]}`}>
                          {c.finalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
