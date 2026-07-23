'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Candidates</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? 'Cancel' : 'Add candidate'}
          </Button>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={newCandidate.name} onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newCandidate.email} onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input value={newCandidate.contactNumber} onChange={(e) => setNewCandidate({ ...newCandidate, contactNumber: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Institute</Label>
                <Input value={newCandidate.institute} onChange={(e) => setNewCandidate({ ...newCandidate, institute: e.target.value })} className="mt-1" placeholder="JSpiders or QSpiders" />
              </div>
              <div>
                <Label>Branch</Label>
                <Input value={newCandidate.branch} onChange={(e) => setNewCandidate({ ...newCandidate, branch: e.target.value })} className="mt-1" placeholder="e.g. Bangalore" />
              </div>
              <div>
                <Label>YOP</Label>
                <Input type="number" value={newCandidate.yop} onChange={(e) => setNewCandidate({ ...newCandidate, yop: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input type="number" value={newCandidate.experience} onChange={(e) => setNewCandidate({ ...newCandidate, experience: e.target.value })} className="mt-1" />
              </div>
            </div>
            {addError && <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>}
            <Button size="sm" onClick={addCandidate} disabled={adding}>
              {adding ? 'Adding…' : 'Add & send invite'}
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="space-y-4">
      {candidates.map((c) => (
        <Card key={c.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{c.name}</CardTitle>
              <p className="text-sm text-zinc-500">{c.email}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {c.round1Score != null ? `${c.round1Score} / 35` : '—'}
                </p>
                <PriorityBadge priority={c.round1Priority} />
              </div>
              <p className="text-xs text-zinc-500">{c.stage.replaceAll('_', ' ')}</p>
              {c.proctoringViolation && (
                <span className="mt-1 inline-block rounded-full border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300">
                  ⚠ Multiple tab switches ({c.tabSwitchCount})
                </span>
              )}
              {c.violationLocked && (
                <span className="mt-1 ml-1 inline-block rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300">
                  ⏸ Test paused
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => toggleAnswers(c.id)}>
              {expanded === c.id ? 'Hide answers' : 'View answers'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyLink(c.id, c.round1Link)}>
              {copiedId === c.id ? 'Copied!' : 'Copy test link'}
            </Button>
            {(c.stage === 'ROUND1_PENDING' || c.stage === 'ROUND1_IN_PROGRESS') && (
              c.allowLateSubmission ? (
                <Button size="sm" variant="outline" onClick={() => toggleLateSubmission(c.id, false)} disabled={busy === c.id}>
                  Late submission allowed — revoke
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => toggleLateSubmission(c.id, true)} disabled={busy === c.id}>
                  Accept after deadline
                </Button>
              )
            )}
            {(c.stage === 'ROUND1_PENDING' || c.stage === 'ROUND1_IN_PROGRESS') && c.violationLocked && (
              <Button size="sm" onClick={() => toggleViolationLock(c.id, true)} disabled={busy === c.id}>
                {busy === c.id ? 'Permitting…' : 'Permit candidate to continue'}
              </Button>
            )}
            {c.stage === 'ROUND1_PENDING' && (
              <Button size="sm" variant="destructive" onClick={() => removeCandidate(c.id)} disabled={removingId === c.id}>
                {removingId === c.id ? 'Removing…' : 'Remove'}
              </Button>
            )}
            {c.stage === 'ROUND1_SUBMITTED' && (
              <>
                <Button size="sm" onClick={() => decide(c.id, true)} disabled={busy === c.id}>
                  Pass → Round 2
                </Button>
                <Button size="sm" variant="destructive" onClick={() => decide(c.id, false)} disabled={busy === c.id}>
                  Fail
                </Button>
              </>
            )}
            {!NOT_YET_SUBMITTED_STAGES.has(c.stage) && (
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-zinc-500">Priority</Label>
                <select
                  className="h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 text-xs text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  value={c.round1Priority ?? ''}
                  disabled={savingPriorityId === c.id}
                  onChange={(e) => setPriority(c.id, e.target.value)}
                >
                  <option value="">Unrated</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </div>
            )}
            {expanded === c.id && (
              <div className="w-full mt-3 space-y-3">
                {answersLoading ? (
                  <p className="text-sm text-zinc-500">Loading answers…</p>
                ) : (
                  answers.map((a) => (
                    <div key={a.questionId} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          {a.questionType} · {a.score} / {a.marks}
                        </p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={a.marks}
                            step="0.5"
                            placeholder="Correct to…"
                            defaultValue={a.score}
                            className="w-20 px-2 py-1 text-xs border rounded-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 dark:text-zinc-100"
                            onChange={(e) => setScoreEdits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 disabled:opacity-50"
                            onClick={() => correctScore(a.id)}
                            disabled={savingScoreId === a.id}
                          >
                            {savingScoreId === a.id ? 'Saving…' : 'Correct'}
                          </button>
                        </div>
                      </div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">{a.prompt}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-400">Candidate&apos;s answer</p>
                      <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono text-xs">{a.rawAnswer || '(no answer)'}</p>
                      {a.referenceAnswer && (
                        <>
                          <p className="mt-2 text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Expected answer</p>
                          <p className="text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap font-mono text-xs">{a.referenceAnswer}</p>
                        </>
                      )}
                      {a.aiFeedback && (
                        <p className="mt-2 text-zinc-500 dark:text-zinc-400 italic">{a.aiFeedback}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {candidates.length === 0 && <p className="text-sm text-zinc-500">No candidates in this batch.</p>}
      </div>
    </div>
  );
}
