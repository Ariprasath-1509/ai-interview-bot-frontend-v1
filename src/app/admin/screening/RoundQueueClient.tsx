'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Candidate {
  id: string;
  name: string;
  email: string;
  stage: string;
}

type Decision = 'SELECTED' | 'HOLD' | 'REJECTED';

export function RoundQueueClient({ round }: { round: 2 | 3 }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { strengths: string; weaknesses: string; practical: string; improvements: string; result: Decision; contactNumber: string; batchLabel: string; source: string; skillSet: string }>>({});

  const notStartedStage = round === 2 ? 'ROUND1_PASSED' : 'ROUND2_SELECTED';
  const inProgressStage = round === 2 ? 'ROUND2_IN_PROGRESS' : 'ROUND3_IN_PROGRESS';

  const load = () => {
    fetch(`/api/screening/admin/round${round}/queue`)
      .then((r) => r.json())
      .then((data) => setCandidates(data.candidates || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [round]);

  const fieldsFor = (id: string) =>
    feedback[id] ?? { strengths: '', weaknesses: '', practical: '', improvements: '', result: 'SELECTED' as Decision, contactNumber: '', batchLabel: '', source: '', skillSet: '' };

  const updateField = (id: string, key: string, value: string) => {
    setFeedback((prev) => ({ ...prev, [id]: { ...fieldsFor(id), [key]: value } }));
  };

  const start = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/screening/admin/candidates/${id}/round${round}/start`, { method: 'POST' });
      load();
    } finally {
      setBusy(null);
    }
  };

  const submitFeedback = async (id: string) => {
    const f = fieldsFor(id);
    if (round === 3 && f.result === 'SELECTED' && (!f.contactNumber || !f.batchLabel || !f.source || !f.skillSet)) {
      alert('Contact number, training batch, source, and skill set are required to onboard a passed candidate.');
      return;
    }
    setBusy(id);
    try {
      const body: Record<string, unknown> = {
        strengths: f.strengths,
        weaknesses: f.weaknesses,
        practical: f.practical,
        improvements: f.improvements,
        result: f.result,
      };
      if (round === 3 && f.result === 'SELECTED') {
        body.conversionDetails = {
          contactNumber: f.contactNumber,
          batchLabel: f.batchLabel,
          source: f.source,
          skillSet: f.skillSet,
        };
      }
      const res = await fetch(`/api/screening/admin/candidates/${id}/round${round}/feedback`, {
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
        <p className="text-sm text-zinc-500">No candidates waiting for Round {round}.</p>
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
            <CardHeader>
              <CardTitle className="text-base">{c.name}</CardTitle>
              <p className="text-sm text-zinc-500">{c.email}</p>
            </CardHeader>
            <CardContent>
              {c.stage === notStartedStage && (
                <Button size="sm" onClick={() => start(c.id)} disabled={busy === c.id}>
                  Start Round {round}
                </Button>
              )}
              {c.stage === inProgressStage && (
                <div className="space-y-3">
                  <div>
                    <Label>Strengths — what they're good at</Label>
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
                  <div>
                    <Label>Result</Label>
                    <select
                      className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100"
                      value={f.result}
                      onChange={(e) => updateField(c.id, 'result', e.target.value)}
                    >
                      <option value="SELECTED">{round === 3 ? 'Pass — onboard as Under Training' : 'Selected'}</option>
                      <option value="HOLD">Hold</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  {round === 3 && f.result === 'SELECTED' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                      <div>
                        <Label>Contact number</Label>
                        <Input className="mt-1" value={f.contactNumber} onChange={(e) => updateField(c.id, 'contactNumber', e.target.value)} />
                      </div>
                      <div>
                        <Label>Training batch</Label>
                        <Input className="mt-1" value={f.batchLabel} onChange={(e) => updateField(c.id, 'batchLabel', e.target.value)} />
                      </div>
                      <div>
                        <Label>Source</Label>
                        <Input className="mt-1" value={f.source} onChange={(e) => updateField(c.id, 'source', e.target.value)} />
                      </div>
                      <div>
                        <Label>Skill set</Label>
                        <Input className="mt-1" value={f.skillSet} onChange={(e) => updateField(c.id, 'skillSet', e.target.value)} />
                      </div>
                    </div>
                  )}

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
