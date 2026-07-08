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

  const load = () => {
    fetch('/api/screening/admin/round3/queue')
      .then((r) => r.json())
      .then((data) => setCandidates(data.candidates || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const fieldsFor = (id: string) => feedback[id] ?? emptyFields;
  const updateScore = (id: string, key: CategoryKey, value: string) => {
    const f = fieldsFor(id);
    setFeedback((prev) => ({ ...prev, [id]: { ...f, scores: { ...f.scores, [key]: value } } }));
  };
  const updateField = (id: string, key: keyof Omit<Fields, 'scores'>, value: string) => {
    setFeedback((prev) => ({ ...prev, [id]: { ...fieldsFor(id), [key]: value } }));
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

  const submitFeedback = async (id: string) => {
    const f = fieldsFor(id);
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
        <p className="text-sm text-zinc-500">No candidates waiting for Round 3.</p>
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
                {c.stage === 'ROUND2_SELECTED' && (
                  <Button size="sm" onClick={() => start(c.id)} disabled={busy === c.id}>
                    Start Round 3
                  </Button>
                )}
                {c.stage === 'ROUND3_IN_PROGRESS' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CATEGORIES.map((cat) => (
                        <div key={cat.key}>
                          <Label>{cat.label} (5 marks)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            className="mt-1"
                            value={f.scores[cat.key]}
                            onChange={(e) => updateScore(c.id, cat.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label>Concluding Comments</Label>
                      <Textarea className="mt-1" value={f.concludingComments} onChange={(e) => updateField(c.id, 'concludingComments', e.target.value)} />
                    </div>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Total: {total(f)} / 30
                    </p>
                    <div>
                      <Label>Result</Label>
                      <select
                        className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100"
                        value={f.result}
                        onChange={(e) => updateField(c.id, 'result', e.target.value)}
                      >
                        <option value="SELECTED">Pass — onboard as Under Training</option>
                        <option value="HOLD">Hold</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>

                    {f.result === 'SELECTED' && (
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
