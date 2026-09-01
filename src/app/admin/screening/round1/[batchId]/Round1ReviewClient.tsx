'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge, PRIORITIES, PRIORITY_LABEL } from '@/components/common/PriorityBadge';

interface Candidate {
  id: string;
  name: string;
  email: string;
  stage: string;
  round1Score: number | null;
  round1Priority: string | null;
  round1Link: string;
  allowLateSubmission: boolean;
  tabSwitchCount: number;
  proctoringViolation: boolean;
  violationLocked: boolean;
}

const NOT_YET_SUBMITTED_STAGES = new Set(['ROUND1_PENDING', 'ROUND1_IN_PROGRESS']);

const emptyNewCandidate = { name: '', email: '', contactNumber: '', institute: '', branch: '', yop: '', experience: '' };

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

export function Round1ReviewClient({ batchId }: { batchId: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [scoreEdits, setScoreEdits] = useState<Record<string, string>>({});
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [savingPriorityId, setSavingPriorityId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState(emptyNewCandidate);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  const load = () => {
    fetch(`/api/screening/admin/batches/${batchId}/candidates`)
      .then((r) => r.json())
      .then((data) => setCandidates(data.candidates || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [batchId]);

  const decide = async (candidateId: string, passed: boolean) => {
    setBusy(candidateId);
    try {
      await fetch(`/api/screening/admin/candidates/${candidateId}/round1-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passed }),
      });
      load();
    } finally {
      setBusy(null);
    }
  };

  const setPriority = async (candidateId: string, priority: string) => {
    setSavingPriorityId(candidateId);
    try {
      await fetch(`/api/screening/admin/candidates/${candidateId}/round1-priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: priority || null }),
      });
      load();
    } finally {
      setSavingPriorityId(null);
    }
  };

  const toggleLateSubmission = async (candidateId: string, allow: boolean) => {
    setBusy(candidateId);
    try {
      await fetch(`/api/screening/admin/candidates/${candidateId}/allow-late-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow }),
      });
      load();
    } finally {
      setBusy(null);
    }
  };

  const toggleViolationLock = async (candidateId: string, allow: boolean) => {
    setBusy(candidateId);
    try {
      await fetch(`/api/screening/admin/candidates/${candidateId}/allow-continue-after-violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow }),
      });
      load();
    } finally {
      setBusy(null);
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

  const correctScore = async (answerId: string) => {
    const value = scoreEdits[answerId];
    if (value === undefined || value === '') return;
    setSavingScoreId(answerId);
    try {
      const res = await fetch(`/api/screening/admin/answers/${answerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(value) }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        alert(data.error || 'Failed to correct score');
        return;
      }
      setAnswers((prev) => prev.map((a) => (a.id === answerId ? { ...a, score: data.score } : a)));
      load(); // refresh the candidate's round1 total shown above
    } finally {
      setSavingScoreId(null);
    }
  };

  const copyLink = (candidateId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(candidateId);
    setTimeout(() => setCopiedId((prev) => (prev === candidateId ? null : prev)), 1500);
  };

  const removeCandidate = async (candidateId: string) => {
    if (!window.confirm('Remove this candidate from the batch?')) return;
    setRemovingId(candidateId);
    try {
      const res = await fetch(`/api/screening/admin/candidates/${candidateId}`, { method: 'DELETE' });
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

  const addCandidate = async () => {
    setAddError('');
    if (!newCandidate.name.trim() || !newCandidate.email.trim()) {
      setAddError('Name and email are required.');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/screening/admin/batches/${batchId}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCandidate.name,
          email: newCandidate.email,
          contactNumber: newCandidate.contactNumber || undefined,
          institute: newCandidate.institute || undefined,
          branch: newCandidate.branch || undefined,
          yop: newCandidate.yop ? Number(newCandidate.yop) : undefined,
          experience: newCandidate.experience ? Number(newCandidate.experience) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setAddError(data.error || 'Failed to add candidate');
        return;
      }
      setNewCandidate(emptyNewCandidate);
      setShowAddForm(false);
      load();
    } catch {
      setAddError('Network error — please try again');
    } finally {
      setAdding(false);
    }
  };

  const min = minScore === '' ? null : Number(minScore);
  const max = maxScore === '' ? null : Number(maxScore);
  const filteredCandidates = candidates.filter((c) => {
    if (min === null && max === null) return true;
    if (c.round1Score == null) return false;
    if (min !== null && c.round1Score < min) return false;
    if (max !== null && c.round1Score > max) return false;
    return true;
  });

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

      {/* ── Card 1: Add candidate ── */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
        <div className="panel-header panel-header-accent-indigo rounded-t-2xl flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Candidates Directory</h3>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:bg-[var(--surface-subtle)] transition-all cursor-pointer"
          >
            {showAddForm ? 'Cancel' : 'Add candidate'}
          </button>
        </div>
        {showAddForm && (
          <div className="p-5 space-y-4 border-t border-[var(--border)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Name</Label>
                <Input
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Email</Label>
                <Input
                  type="email"
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Contact Number</Label>
                <Input
                  value={newCandidate.contactNumber}
                  onChange={(e) => setNewCandidate({ ...newCandidate, contactNumber: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Institute</Label>
                <Input
                  value={newCandidate.institute}
                  onChange={(e) => setNewCandidate({ ...newCandidate, institute: e.target.value })}
                  placeholder="JSpiders or QSpiders"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Branch</Label>
                <Input
                  value={newCandidate.branch}
                  onChange={(e) => setNewCandidate({ ...newCandidate, branch: e.target.value })}
                  placeholder="e.g. Bangalore"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">YOP</Label>
                <Input
                  type="number"
                  value={newCandidate.yop}
                  onChange={(e) => setNewCandidate({ ...newCandidate, yop: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Experience (years)</Label>
                <Input
                  type="number"
                  value={newCandidate.experience}
                  onChange={(e) => setNewCandidate({ ...newCandidate, experience: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
            </div>
            {addError && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{addError}</p>}
            <button
              type="button"
              onClick={addCandidate}
              disabled={adding}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {adding ? 'Adding…' : 'Add & send invite'}
            </button>
          </div>
        )}
      </div>

      {/* ── Card 2: Filter controls ── */}
      <div className="panel-card p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Min marks (/35)</Label>
            <Input
              type="number"
              min={0}
              max={35}
              className="w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-9 font-medium focus:border-[#6D28D9]"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Max marks (/35)</Label>
            <Input
              type="number"
              min={0}
              max={35}
              className="w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-9 font-medium focus:border-[#6D28D9]"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="35"
            />
          </div>
          {(min !== null || max !== null) && (
            <button
              type="button"
              onClick={() => { setMinScore(''); setMaxScore(''); }}
              className="px-3 py-2 text-xs font-bold text-[#6D28D9] hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
        <p className="text-xs font-bold text-[var(--text-secondary)]">
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </p>
      </div>

      {/* ── Candidates list ── */}
      <div className="space-y-4">
        {filteredCandidates.map((c) => (
          <div key={c.id} className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
            <div className="panel-header panel-header-accent-purple rounded-t-2xl flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-[var(--text-primary)]">{c.name}</h4>
                <p className="text-xs font-medium text-[var(--text-secondary)]">{c.email}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-extrabold text-[var(--text-primary)]">
                    {c.round1Score != null ? `${c.round1Score} / 35` : '—'}
                  </p>
                  <PriorityBadge priority={c.round1Priority} />
                </div>
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{c.stage.replaceAll('_', ' ')}</p>
                {c.proctoringViolation && (
                  <span className="inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    ⚠ Multiple tab switches ({c.tabSwitchCount})
                  </span>
                )}
                {c.violationLocked && (
                  <span className="inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    ⏸ Test paused
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAnswers(c.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  {expanded === c.id ? 'Hide answers' : 'View answers'}
                </button>
                <button
                  type="button"
                  onClick={() => copyLink(c.id, c.round1Link)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[#6D28D9] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  {copiedId === c.id ? 'Copied!' : 'Copy test link'}
                </button>
                {(c.stage === 'ROUND1_PENDING' || c.stage === 'ROUND1_IN_PROGRESS') && (
                  c.allowLateSubmission ? (
                    <button
                      type="button"
                      onClick={() => toggleLateSubmission(c.id, false)}
                      disabled={busy === c.id}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                    >
                      Late submission allowed — revoke
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleLateSubmission(c.id, true)}
                      disabled={busy === c.id}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                    >
                      Accept after deadline
                    </button>
                  )
                )}
                {(c.stage === 'ROUND1_PENDING' || c.stage === 'ROUND1_IN_PROGRESS') && c.violationLocked && (
                  <button
                    type="button"
                    onClick={() => toggleViolationLock(c.id, true)}
                    disabled={busy === c.id}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                  >
                    {busy === c.id ? 'Permitting…' : 'Permit candidate to continue'}
                  </button>
                )}
                {c.stage === 'ROUND1_PENDING' && (
                  <button
                    type="button"
                    onClick={() => removeCandidate(c.id)}
                    disabled={removingId === c.id}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer"
                  >
                    {removingId === c.id ? 'Removing…' : 'Remove'}
                  </button>
                )}
                {c.stage === 'ROUND1_SUBMITTED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => decide(c.id, true)}
                      disabled={busy === c.id}
                      className="px-4 py-1.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      Pass → Round 2
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(c.id, false)}
                      disabled={busy === c.id}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer"
                    >
                      Fail
                    </button>
                  </>
                )}
                {!NOT_YET_SUBMITTED_STAGES.has(c.stage) && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Label className="text-xs font-bold text-[var(--text-secondary)]">Priority</Label>
                    <Select
                      value={c.round1Priority ?? 'UNRATED'}
                      onValueChange={(val) => setPriority(c.id, val === 'UNRATED' ? '' : val)}
                    >
                      <SelectTrigger disabled={savingPriorityId === c.id} className="w-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-9 font-medium focus:border-[#6D28D9]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="max-h-44">
                        <SelectItem value="UNRATED" className="text-xs font-semibold">Unrated</SelectItem>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p} className="text-xs font-semibold">
                            {PRIORITY_LABEL[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {expanded === c.id && (
                <div className="space-y-3 pt-2">
                  {answersLoading ? (
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Loading answers…</p>
                  ) : (
                    answers.map((a) => (
                      <div key={a.questionId} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
                            {a.questionType} · {a.score} / {a.marks}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={a.marks}
                              step="0.5"
                              placeholder="Correct to…"
                              defaultValue={a.score}
                              className="w-20 px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-[#6D28D9]"
                              onChange={(e) => setScoreEdits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="text-xs font-bold text-[#6D28D9] hover:underline cursor-pointer disabled:opacity-50"
                              onClick={() => correctScore(a.id)}
                              disabled={savingScoreId === a.id}
                            >
                              {savingScoreId === a.id ? 'Saving…' : 'Correct'}
                            </button>
                          </div>
                        </div>
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
            </div>
          </div>
        ))}
        {candidates.length === 0 && <p className="text-xs font-medium text-[var(--text-secondary)]">No candidates in this batch.</p>}
        {candidates.length > 0 && filteredCandidates.length === 0 && (
          <p className="text-xs font-medium text-[var(--text-secondary)]">No candidates match this marks filter.</p>
        )}
      </div>
    </div>
  );
}
