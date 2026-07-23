'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriorityBadge } from '@/components/common/PriorityBadge';

interface Answer {
  id: string;
  questionId: string;
  questionType: string;
  prompt: string;
  marks: number;
  referenceAnswer: string | null;
  rawAnswer: string;
  score: number;
  aiFeedback: string;
}

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  stage: string;
  finalStatus: 'Selected' | 'Rejected' | 'Hold' | 'In Progress';
  round1Score: number | null;
  round1Priority: string | null;
  round1Answers: Answer[];
  round2Strengths: string | null;
  round2Weaknesses: string | null;
  round2Practical: string | null;
  round2Improvements: string | null;
  round2Marks: number | null;
  round2Result: string | null;
  round3Communication: number | null;
  round3ProblemSolving: number | null;
  round3AttitudeCoachability: number | null;
  round3LearningAgility: number | null;
  round3Teamwork: number | null;
  round3BodyLanguage: number | null;
  round3ConcludingComments: string | null;
  round3Total: number | null;
  round3Result: string | null;
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

const ROUND3_CATEGORIES: { key: keyof CandidateRow; label: string }[] = [
  { key: 'round3Communication', label: 'Communication Skills' },
  { key: 'round3ProblemSolving', label: 'Problem-Solving & Logical Thinking' },
  { key: 'round3AttitudeCoachability', label: 'Attitude & Coachability' },
  { key: 'round3LearningAgility', label: 'Learning Agility' },
  { key: 'round3Teamwork', label: 'Teamwork & Collaboration' },
  { key: 'round3BodyLanguage', label: 'Body Language & Professionalism' },
];

export function BatchSummaryClient({ batchId }: { batchId: string }) {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

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
                    <th className="py-2 pr-4">Priority</th>
                    <th className="py-2 pr-4">Round 1 (/35)</th>
                    <th className="py-2 pr-4">Round 2 (/35)</th>
                    <th className="py-2 pr-4">Round 3 (/30)</th>
                    <th className="py-2 pr-4">Total (/100)</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <Fragment key={c.id}>
                      <tr className="border-b border-zinc-100 dark:border-zinc-900">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</div>
                          <div className="text-[11px] text-zinc-400">{c.email}</div>
                        </td>
                        <td className="py-2 pr-4"><PriorityBadge priority={c.round1Priority} /></td>
                        <td className="py-2 pr-4">{c.round1Score ?? '—'}</td>
                        <td className="py-2 pr-4">{c.round2Marks ?? '—'}</td>
                        <td className="py-2 pr-4">{c.round3Total ?? '—'}</td>
                        <td className="py-2 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">{c.totalMarks ?? '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadgeCls[c.finalStatus]}`}>
                            {c.finalStatus}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            type="button"
                            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                            onClick={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
                          >
                            {expanded === c.id ? 'Hide details' : 'View details'}
                          </button>
                        </td>
                      </tr>
                      {expanded === c.id && (
                        <tr className="border-b border-zinc-100 dark:border-zinc-900">
                          <td colSpan={8} className="py-4 bg-zinc-50 dark:bg-zinc-900/40">
                            <CandidateDetail candidate={c} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

function CandidateDetail({ candidate: c }: { candidate: CandidateRow }) {
  return (
    <div className="px-2 space-y-5">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
          Round 1 — Written Test ({c.round1Score ?? '—'} / 35)
        </p>
        {c.round1Answers.length === 0 ? (
          <p className="text-sm text-zinc-500">No answers recorded.</p>
        ) : (
          <div className="space-y-2">
            {c.round1Answers.map((a) => (
              <div key={a.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm bg-white dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{a.questionType} · {a.score} / {a.marks}</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">{a.prompt}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-400">Candidate&apos;s answer</p>
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono text-xs">{a.rawAnswer || '(no answer)'}</p>
                {a.referenceAnswer && (
                  <>
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Expected answer</p>
                    <p className="text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap font-mono text-xs">{a.referenceAnswer}</p>
                  </>
                )}
                {a.aiFeedback && <p className="mt-2 text-zinc-500 dark:text-zinc-400 italic">{a.aiFeedback}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
          Round 2 — Technical Interview ({c.round2Marks ?? '—'} / 35{c.round2Result ? ` · ${c.round2Result}` : ''})
        </p>
        {c.round2Marks == null ? (
          <p className="text-sm text-zinc-500">Not conducted.</p>
        ) : (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm bg-white dark:bg-zinc-950 space-y-1.5">
            {c.round2Strengths && <p><span className="text-zinc-500">Strengths:</span> {c.round2Strengths}</p>}
            {c.round2Weaknesses && <p><span className="text-zinc-500">Weaknesses:</span> {c.round2Weaknesses}</p>}
            {c.round2Practical && <p><span className="text-zinc-500">Practical:</span> {c.round2Practical}</p>}
            {c.round2Improvements && <p><span className="text-zinc-500">Improvements:</span> {c.round2Improvements}</p>}
          </div>
        )}
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
          Round 3 — Managerial Round ({c.round3Total ?? '—'} / 30{c.round3Result ? ` · ${c.round3Result}` : ''})
        </p>
        {c.round3Total == null ? (
          <p className="text-sm text-zinc-500">Not conducted.</p>
        ) : (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm bg-white dark:bg-zinc-950 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ROUND3_CATEGORIES.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
                  <p className="text-zinc-900 dark:text-zinc-100">{(c[key] as number | null) ?? '—'} / 5</p>
                </div>
              ))}
            </div>
            {c.round3ConcludingComments && (
              <p className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Concluding comments:</span> {c.round3ConcludingComments}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
