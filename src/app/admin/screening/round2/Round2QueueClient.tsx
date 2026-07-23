'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  if (candidates.length === 0) {
    return (
      <div>
        {backLink}
        <p className="text-sm text-zinc-500">No candidates waiting for Round 2.</p>
      </div>
    );
  }

  return (
    <div>
      {backLink}
      <div className="space-y-4">
        {candidates.map((c) => {
          const f = fieldsFor(c.id);
          return (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <PriorityBadge priority={c.round1Priority} />
                  </div>
                  <p className="text-sm text-zinc-500">{c.email}</p>
                  <p className="text-xs text-zinc-500">
                    Round 1: {c.round1Score != null ? `${c.round1Score} / 35` : '—'}
                    {c.proctoringViolation && (
                      <span className="ml-2 text-red-600 dark:text-red-400">⚠ Multiple tab switches</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCandidate(c.id)}
                  disabled={removingId === c.id}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                  {removingId === c.id ? 'Removing…' : 'Delete'}
                </button>
              </CardHeader>
              <CardContent>
                {c.stage === 'ROUND1_PASSED' && (
                  <Button size="sm" onClick={() => start(c.id)} disabled={busy === c.id}>
                    Start Round 2
                  </Button>
                )}
                {c.stage === 'ROUND2_IN_PROGRESS' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Strengths — what they&apos;re good at</Label>
                      <Textarea className="mt-1" value={f.strengths} onChange={(e) => updateField(c.id, 'strengths', e.target.value)} />
                    </div>
                    <div>
                      <Label>Weaknesses / lags in</Label>
                      <Textarea className="mt-1" value={f.weaknesses} onChange={(e) => updateField(c.id, 'weaknesses', e.target.value)} />
                    </div>
                    <div>
                      <Label>Practical skills</Label>
                      <Textarea className="mt-1" value={f.practical} onChange={(e) => updateField(c.id, 'practical', e.target.value)} />
                    </div>
                    <div>
                      <Label>Where they must improve</Label>
                      <Textarea className="mt-1" value={f.improvements} onChange={(e) => updateField(c.id, 'improvements', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Marks (out of 35)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={35}
                          className="mt-1"
                          value={f.marks}
                          onChange={(e) => updateField(c.id, 'marks', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Result</Label>
                        <select
                          className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100"
                          value={f.result}
                          onChange={(e) => updateField(c.id, 'result', e.target.value)}
                        >
                          <option value="SELECTED">Selected</option>
                          <option value="HOLD">Hold</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </div>

                    <Button size="sm" onClick={() => submitFeedback(c.id)} disabled={busy === c.id}>
                      Submit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
