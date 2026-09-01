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
  Selected: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  Rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  Hold: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  'In Progress': 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
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
    <Link
      href="/admin/screening"
      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:bg-[var(--surface-subtle)] hover:border-[#6D28D9] transition-all cursor-pointer mb-4"
    >
      ← Back to Screening
    </Link>
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 animate-in">
        {backLink}
        <p className="text-xs font-medium text-[var(--text-secondary)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in">
      {backLink}

      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="panel-card p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-[var(--surface)] shadow-xs">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total</p>
            <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">{counts.total}</p>
          </div>
          <div className="panel-card p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-[var(--surface)] shadow-xs">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Selected</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{counts.selected}</p>
          </div>
          <div className="panel-card p-4 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-[var(--surface)] shadow-xs">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Rejected</p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{counts.rejected}</p>
          </div>
          <div className="panel-card p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-[var(--surface)] shadow-xs">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Hold</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{counts.hold}</p>
          </div>
          <div className="panel-card p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-[var(--surface)] shadow-xs">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">{counts.inProgress}</p>
          </div>
        </div>
      )}

      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
        <div className="panel-header panel-header-accent-indigo rounded-t-2xl flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Consolidated Marks</h3>
          <span className="text-xs font-medium text-[var(--text-secondary)]">Complete evaluation summary</span>
        </div>
        <div className="p-5">
          {candidates.length === 0 ? (
            <p className="text-xs font-medium text-[var(--text-secondary)]">No candidates in this batch.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Round 1 (/35)</th>
                    <th className="py-3 px-4">Round 2 (/35)</th>
                    <th className="py-3 px-4">Round 3 (/30)</th>
                    <th className="py-3 px-4">Total (/100)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {candidates.map((c) => (
                    <Fragment key={c.id}>
                      <tr className="hover:bg-[var(--surface-subtle)] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[var(--text-primary)]">{c.name}</div>
                          <div className="text-[11px] font-medium text-[var(--text-secondary)]">{c.email}</div>
                        </td>
                        <td className="py-3 px-4"><PriorityBadge priority={c.round1Priority} /></td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{c.round1Score ?? '—'}</td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{c.round2Marks ?? '—'}</td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{c.round3Total ?? '—'}</td>
                        <td className="py-3 px-4 font-extrabold text-[#6D28D9] dark:text-purple-400">{c.totalMarks ?? '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${statusBadgeCls[c.finalStatus]}`}>
                            {c.finalStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="text-xs font-bold text-[#6D28D9] hover:underline cursor-pointer"
                            onClick={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
                          >
                            {expanded === c.id ? 'Hide details' : 'View details'}
                          </button>
                        </td>
                      </tr>
                      {expanded === c.id && (
                        <tr>
                          <td colSpan={8} className="p-4 bg-[var(--surface-subtle)] border-b border-[var(--border)]">
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
        </div>
      </div>
    </div>
  );
}

function CandidateDetail({ candidate: c }: { candidate: CandidateRow }) {
  return (
    <div className="space-y-4 text-xs">
      <section className="space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
          Round 1 — Written Test ({c.round1Score ?? '—'} / 35)
        </p>
        {c.round1Answers.length === 0 ? (
          <p className="text-xs font-medium text-[var(--text-secondary)]">No answers recorded.</p>
        ) : (
          <div className="space-y-2">
            {c.round1Answers.map((a) => (
              <div key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">{a.questionType} · {a.score} / {a.marks}</p>
                <p className="font-bold text-[var(--text-primary)] whitespace-pre-wrap">{a.prompt}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Candidate&apos;s answer</p>
                <p className="text-[var(--text-primary)] whitespace-pre-wrap font-mono text-xs">{a.rawAnswer || '(no answer)'}</p>
                {a.referenceAnswer && (
                  <>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Expected answer</p>
                    <p className="text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap font-mono text-xs">{a.referenceAnswer}</p>
                  </>
                )}
                {a.aiFeedback && <p className="mt-1 text-[var(--text-secondary)] italic">{a.aiFeedback}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
          Round 2 — Technical Interview ({c.round2Marks ?? '—'} / 35{c.round2Result ? ` · ${c.round2Result}` : ''})
        </p>
        {c.round2Marks == null ? (
          <p className="text-xs font-medium text-[var(--text-secondary)]">Not conducted.</p>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-1">
            {c.round2Strengths && <p><span className="font-bold text-[var(--text-secondary)]">Strengths:</span> {c.round2Strengths}</p>}
            {c.round2Weaknesses && <p><span className="font-bold text-[var(--text-secondary)]">Weaknesses:</span> {c.round2Weaknesses}</p>}
            {c.round2Practical && <p><span className="font-bold text-[var(--text-secondary)]">Practical:</span> {c.round2Practical}</p>}
            {c.round2Improvements && <p><span className="font-bold text-[var(--text-secondary)]">Improvements:</span> {c.round2Improvements}</p>}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
          Round 3 — Managerial Round ({c.round3Total ?? '—'} / 30{c.round3Result ? ` · ${c.round3Result}` : ''})
        </p>
        {c.round3Total == null ? (
          <p className="text-xs font-medium text-[var(--text-secondary)]">Not conducted.</p>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ROUND3_CATEGORIES.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
                  <p className="font-bold text-[var(--text-primary)]">{(c[key] as number | null) ?? '—'} / 5</p>
                </div>
              ))}
            </div>
            {c.round3ConcludingComments && (
              <p className="pt-2 border-t border-[var(--border)]">
                <span className="font-bold text-[var(--text-secondary)]">Concluding comments:</span> {c.round3ConcludingComments}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
