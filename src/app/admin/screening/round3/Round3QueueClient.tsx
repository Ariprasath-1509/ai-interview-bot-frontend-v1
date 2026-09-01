'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSkillSetOptions } from '@/hooks/useSkillSetOptions';
import { useCandidateSourceOptions } from '@/hooks/useCandidateSourceOptions';
import { PriorityBadge } from '@/components/common/PriorityBadge';

interface Candidate {
  id: string;
  name: string;
  email: string;
  stage: string;
  contactNumber: string | null;
  institute: string | null;
  round1Score: number | null;
  round1Priority: string | null;
  proctoringViolation: boolean;
  round2Strengths: string | null;
  round2Weaknesses: string | null;
  round2Practical: string | null;
  round2Improvements: string | null;
  round2Marks: number | null;
  round2Result: string | null;
}

type Decision = 'SELECTED' | 'HOLD' | 'REJECTED';

const CATEGORIES = [
  { key: 'communication', label: 'Communication Skills' },
  { key: 'problemSolving', label: 'Problem-Solving & Logical Thinking' },
  { key: 'attitudeCoachability', label: 'Attitude & Coachability' },
  { key: 'learningAgility', label: 'Learning Agility' },
  { key: 'teamwork', label: 'Teamwork & Collaboration' },
  { key: 'bodyLanguage', label: 'Body Language & Professionalism' },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

interface Fields {
  scores: Record<CategoryKey, string>;
  concludingComments: string;
  result: Decision;
  contactNumber: string;
  batchLabel: string;
  source: string;
  skillSet: string;
}

const emptyFields: Fields = {
  scores: { communication: '', problemSolving: '', attitudeCoachability: '', learningAgility: '', teamwork: '', bodyLanguage: '' },
  concludingComments: '',
  result: 'SELECTED',
  contactNumber: '',
  batchLabel: '',
  source: '',
  skillSet: '',
};

export function Round3QueueClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Fields>>({});
  const { options: skillSetOptions } = useSkillSetOptions();
  const { options: sourceOptions } = useCandidateSourceOptions();

  const load = () => {
    fetch('/api/screening/admin/round3/queue')
      .then((r) => r.json())
      .then((data) => setCandidates(data.candidates || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Contact number is usually already known from CSV intake — pre-fill rather than ask the manager
  // to retype it. Source defaults to Bench (this whole pipeline is bench/training candidates — it is
  // NOT the same thing as the candidate's JSpiders/QSpiders institute, which isn't a valid source value).
  const fieldsFor = (c: Candidate) =>
    feedback[c.id] ?? { ...emptyFields, contactNumber: c.contactNumber ?? '', source: 'BENCH' };
  const updateScore = (c: Candidate, key: CategoryKey, value: string) => {
    const f = fieldsFor(c);
    setFeedback((prev) => ({ ...prev, [c.id]: { ...f, scores: { ...f.scores, [key]: value } } }));
  };
  const updateField = (c: Candidate, key: keyof Omit<Fields, 'scores'>, value: string) => {
    setFeedback((prev) => ({ ...prev, [c.id]: { ...fieldsFor(c), [key]: value } }));
  };

  const total = (f: Fields) =>
    CATEGORIES.reduce((sum, c) => sum + (Number(f.scores[c.key]) || 0), 0);

  const start = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/screening/admin/candidates/${id}/round3/start`, { method: 'POST' });
      load();
    } finally {
      setBusy(null);
    }
  };

  const submitFeedback = async (candidate: Candidate) => {
    const f = fieldsFor(candidate);
    for (const c of CATEGORIES) {
      const v = f.scores[c.key];
      if (v === '' || Number(v) < 0 || Number(v) > 5) {
        alert(`${c.label} must be scored 0-5.`);
        return;
      }
    }
    if (f.result === 'SELECTED' && (!f.batchLabel || !f.skillSet)) {
      alert('Training batch and skill set are required to onboard a passed candidate.');
      return;
    }
    const id = candidate.id;
    setBusy(id);
    try {
      const body: Record<string, unknown> = {
        communication: Number(f.scores.communication),
        problemSolving: Number(f.scores.problemSolving),
        attitudeCoachability: Number(f.scores.attitudeCoachability),
        learningAgility: Number(f.scores.learningAgility),
        teamwork: Number(f.scores.teamwork),
        bodyLanguage: Number(f.scores.bodyLanguage),
        concludingComments: f.concludingComments,
        result: f.result,
      };
      if (f.result === 'SELECTED') {
        body.conversionDetails = {
          contactNumber: f.contactNumber,
          batchLabel: f.batchLabel,
          source: f.source,
          skillSet: f.skillSet,
        };
      }
      const res = await fetch(`/api/screening/admin/candidates/${id}/round3/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        <p className="text-xs font-medium text-[var(--text-secondary)]">No candidates waiting for Round 3.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in">
      {backLink}
      <p className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
        {candidates.length} Candidate{candidates.length === 1 ? '' : 's'} in Round 3
      </p>
      <div className="space-y-4">
        {candidates.map((c) => {
          const f = fieldsFor(c);
          return (
            <div key={c.id} className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
              <div className="panel-header panel-header-accent-indigo rounded-t-2xl flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[var(--text-primary)]">{c.name}</h3>
                    <PriorityBadge priority={c.round1Priority} />
                  </div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">{c.email}</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-xs space-y-1.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Previous rounds — for cross-questioning
                  </p>
                  <p className="text-[var(--text-primary)] font-semibold">
                    Round 1: {c.round1Score != null ? `${c.round1Score} / 35` : '—'}
                    {c.proctoringViolation && (
                      <span className="ml-2 inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        ⚠ Multiple tab switches
                      </span>
                    )}
                  </p>
                  <p className="text-[var(--text-primary)] font-semibold">
                    Round 2: {c.round2Marks != null ? `${c.round2Marks} / 35` : '—'}
                    {c.round2Result && <span className="ml-2 text-[var(--text-secondary)] font-normal">({c.round2Result})</span>}
                  </p>
                  {c.round2Strengths && <p><span className="font-bold text-[var(--text-secondary)]">Strengths:</span> {c.round2Strengths}</p>}
                  {c.round2Weaknesses && <p><span className="font-bold text-[var(--text-secondary)]">Weaknesses:</span> {c.round2Weaknesses}</p>}
                  {c.round2Practical && <p><span className="font-bold text-[var(--text-secondary)]">Practical:</span> {c.round2Practical}</p>}
                  {c.round2Improvements && <p><span className="font-bold text-[var(--text-secondary)]">Improvements:</span> {c.round2Improvements}</p>}
                </div>

                {c.stage === 'ROUND2_SELECTED' && (
                  <button
                    type="button"
                    onClick={() => start(c.id)}
                    disabled={busy === c.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    Start Round 3
                  </button>
                )}

                {c.stage === 'ROUND3_IN_PROGRESS' && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CATEGORIES.map((cat) => (
                        <div key={cat.key} className="space-y-1.5">
                          <Label className="text-xs font-bold text-[var(--text-primary)]">{cat.label} (5 marks)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                            value={f.scores[cat.key]}
                            onChange={(e) => updateScore(c, cat.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Concluding Comments</Label>
                      <Textarea
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs p-3 focus:border-[#6D28D9]"
                        value={f.concludingComments}
                        onChange={(e) => updateField(c, 'concludingComments', e.target.value)}
                      />
                    </div>
                    <p className="text-xs font-extrabold text-[#6D28D9] dark:text-purple-400">
                      Total: {total(f)} / 30
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Result</Label>
                      <Select
                        value={f.result}
                        onValueChange={(val) => updateField(c, 'result', val as Decision)}
                      >
                        <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                          <SelectValue placeholder="Select Result" />
                        </SelectTrigger>
                        <SelectContent className="max-h-44">
                          <SelectItem value="SELECTED" className="text-xs font-semibold">Pass — onboard as Under Training</SelectItem>
                          <SelectItem value="HOLD" className="text-xs font-semibold">Hold</SelectItem>
                          <SelectItem value="REJECTED" className="text-xs font-semibold">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {f.result === 'SELECTED' && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 space-y-3">
                        <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                          Not part of the evaluation — this creates the candidate&apos;s real account.
                          {c.institute && ` Institute on file: ${c.institute}.`} Contact number is pre-filled from
                          Round 1 intake when known; training batch and skill set are always required.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-[var(--text-primary)]">Contact number{c.contactNumber ? ' (on file)' : ''}</Label>
                            <Input
                              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                              value={f.contactNumber}
                              onChange={(e) => updateField(c, 'contactNumber', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-[var(--text-primary)]">Training batch *</Label>
                            <Input
                              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                              value={f.batchLabel}
                              onChange={(e) => updateField(c, 'batchLabel', e.target.value)}
                              placeholder="e.g. 2026-Q1-Java"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-[var(--text-primary)]">Source *</Label>
                            <Select
                              value={f.source}
                              onValueChange={(val) => updateField(c, 'source', val)}
                            >
                              <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                                <SelectValue placeholder="Select Source" />
                              </SelectTrigger>
                              <SelectContent className="max-h-44">
                                {sourceOptions.map((o) => (
                                  <SelectItem key={o.code} value={o.code} className="text-xs font-semibold">
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-[var(--text-primary)]">Skill set *</Label>
                            <Select
                              value={f.skillSet || "NONE"}
                              onValueChange={(val) => updateField(c, 'skillSet', val === "NONE" ? "" : val)}
                            >
                              <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                                <SelectValue placeholder="— Select Skill set —" />
                              </SelectTrigger>
                              <SelectContent className="max-h-44">
                                <SelectItem value="NONE" className="text-xs font-semibold">—</SelectItem>
                                {skillSetOptions.map((o) => (
                                  <SelectItem key={o.code} value={o.code} className="text-xs font-semibold">
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => submitFeedback(c)}
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
