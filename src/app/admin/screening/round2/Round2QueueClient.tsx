'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/common/PriorityBadge';

interface Candidate {
  id: string;
  name: string;
  email: string;
  stage: string;
  round1Score: number | null;
  round1Priority: string | null;
  proctoringViolation: boolean;
}

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

type Decision = 'SELECTED' | 'HOLD' | 'REJECTED';

interface Fields {
  strengths: string;
  weaknesses: string;
  practical: string;
  improvements: string;
  marks: string;
  result: Decision;
}

const emptyFields: Fields = { strengths: '', weaknesses: '', practical: '', improvements: '', marks: '', result: 'SELECTED' };

export function Round2QueueClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Fields>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);

  const load = () => {
    fetch('/api/screening/admin/round2/queue')
      .then((r) => r.json())
      .then((data) => setCandidates(data.candidates || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const fieldsFor = (id: string) => feedback[id] ?? emptyFields;
  const updateField = (id: string, key: keyof Fields, value: string) => {
    setFeedback((prev) => ({ ...prev, [id]: { ...fieldsFor(id), [key]: value } }));
  };

  const removeCandidate = async (id: string) => {
    if (!window.confirm('Remove this candidate from Round 2? This cannot be undone.')) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/screening/admin/candidates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        alert(data.error || 'Failed to remove candidate');
        return;
      }
      load();
    } finally {
      setRemovingId(null);
    }
  };

  const toggleAnswers = async (candidateId: string) => {
    if (expanded === candidateId) {
      setExpanded(null);
      return;
    }
    setExpanded(candidateId);
    setAnswersLoading(true);
    try {
      const res = await fetch(`/api/screening/admin/candidates/${candidateId}/answers`);
      const data = await res.json();
      setAnswers(data.answers || []);
    } finally {
      setAnswersLoading(false);
    }
  };

  const start = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/screening/admin/candidates/${id}/round2/start`, { method: 'POST' });
      load();
    } finally {
      setBusy(null);
    }
  };

  const submitFeedback = async (id: string) => {
    const f = fieldsFor(id);
    if (f.marks !== '' && (Number(f.marks) < 0 || Number(f.marks) > 35)) {
      alert('Marks must be between 0 and 35.');
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/screening/admin/candidates/${id}/round2/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strengths: f.strengths,
          weaknesses: f.weaknesses,
          practical: f.practical,
          improvements: f.improvements,
          marks: f.marks === '' ? null : Number(f.marks),
          result: f.result,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        alert(data.error || 'Failed to submit feedback');
        return;
      }
      load();
    } finally {
      setBusy(null);
    }
  };

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
  if (candidates.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 animate-in">
        {backLink}
        <p className="text-xs font-medium text-[var(--text-secondary)]">No candidates waiting for Round 2.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in">
      {backLink}
      <p className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
        {candidates.length} Candidate{candidates.length === 1 ? '' : 's'} in Round 2
      </p>
      <div className="space-y-4">
        {candidates.map((c) => {
          const f = fieldsFor(c.id);
          return (
            <div key={c.id} className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
              <div className="panel-header panel-header-accent-purple rounded-t-2xl flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[var(--text-primary)]">{c.name}</h3>
                    <PriorityBadge priority={c.round1Priority} />
                  </div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">{c.email}</p>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">
                    Round 1: {c.round1Score != null ? `${c.round1Score} / 35` : '—'}
                    {c.proctoringViolation && (
                      <span className="ml-2 inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        ⚠ Multiple tab switches
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-bold text-[#6D28D9] hover:underline cursor-pointer"
                    onClick={() => toggleAnswers(c.id)}
                  >
                    {expanded === c.id ? 'Hide Round 1 answers' : 'View Round 1 answers'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeCandidate(c.id)}
                  disabled={removingId === c.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 font-bold text-xs hover:bg-rose-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {removingId === c.id ? 'Removing…' : 'Delete'}
                </button>
              </div>

              <div className="p-5 space-y-4">
                {expanded === c.id && (
                  <div className="space-y-3 p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
                    {answersLoading ? (
                      <p className="text-xs font-medium text-[var(--text-secondary)]">Loading answers…</p>
                    ) : answers.length === 0 ? (
                      <p className="text-xs font-medium text-[var(--text-secondary)]">No Round 1 answers recorded.</p>
                    ) : (
                      answers.map((a) => (
                        <div key={a.questionId} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
                            {a.questionType} · {a.score} / {a.marks}
                          </p>
                          <p className="font-bold text-[var(--text-primary)] whitespace-pre-wrap">{a.prompt}</p>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Candidate&apos;s answer</p>
                          <p className="text-[var(--text-primary)] whitespace-pre-wrap font-mono text-xs mt-0.5">{a.rawAnswer || '(no answer)'}</p>
                          {a.referenceAnswer && (
                            <>
                              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Expected answer</p>
                              <p className="text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap font-mono text-xs mt-0.5">{a.referenceAnswer}</p>
                            </>
                          )}
                          {a.aiFeedback && (
                            <p className="mt-2 text-[var(--text-secondary)] italic">{a.aiFeedback}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {c.stage === 'ROUND1_PASSED' && (
                  <button
                    type="button"
                    onClick={() => start(c.id)}
                    disabled={busy === c.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    Start Round 2
                  </button>
                )}

                {c.stage === 'ROUND2_IN_PROGRESS' && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Strengths — what they&apos;re good at</Label>
                      <Textarea
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs p-3 focus:border-[#6D28D9]"
                        value={f.strengths}
                        onChange={(e) => updateField(c.id, 'strengths', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Weaknesses / lags in</Label>
                      <Textarea
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs p-3 focus:border-[#6D28D9]"
                        value={f.weaknesses}
                        onChange={(e) => updateField(c.id, 'weaknesses', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Practical skills</Label>
                      <Textarea
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs p-3 focus:border-[#6D28D9]"
                        value={f.practical}
                        onChange={(e) => updateField(c.id, 'practical', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Where they must improve</Label>
                      <Textarea
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs p-3 focus:border-[#6D28D9]"
                        value={f.improvements}
                        onChange={(e) => updateField(c.id, 'improvements', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[var(--text-primary)]">Marks (out of 35)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={35}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                          value={f.marks}
                          onChange={(e) => updateField(c.id, 'marks', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[var(--text-primary)]">Result</Label>
                        <Select
                          value={f.result}
                          onValueChange={(val) => updateField(c.id, 'result', val as Decision)}
                        >
                          <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                            <SelectValue placeholder="Select Result" />
                          </SelectTrigger>
                          <SelectContent className="max-h-44">
                            <SelectItem value="SELECTED" className="text-xs font-semibold">Selected</SelectItem>
                            <SelectItem value="HOLD" className="text-xs font-semibold">Hold</SelectItem>
                            <SelectItem value="REJECTED" className="text-xs font-semibold">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => submitFeedback(c.id)}
                      disabled={busy === c.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      Submit Feedback
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
