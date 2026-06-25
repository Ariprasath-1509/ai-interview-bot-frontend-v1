'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import Link from 'next/link';

interface EditFormData {
  jdTitle: string;
  jdText: string;
  focusAreas: string;
  interviewMode: string;
  customDurationMinutes: number | null;
  roundName: string;
  includeProgrammingQuestions: boolean;
  scheduledAt: string;
  expiresAt: string;
}

interface EditInterviewClientProps {
  interviewId: string;
  isExpired?: boolean;
  initialData: {
    jdTitle?: string;
    jdText?: string;
    focusAreas?: string;
    interviewMode?: string;
    customDurationMinutes?: number | null;
    roundName?: string;
    includeProgrammingQuestions?: boolean;
    scheduledAt?: string | null;
    expiresAt?: string | null;
  };
}

const INTERVIEW_MODES = [
  { value: 'SCREENING', label: 'SCREENING (5q, 15min)' },
  { value: 'L1', label: 'L1 (7q, 20min)' },
  { value: 'L2', label: 'L2 (8q, 25min)' },
  { value: 'L3', label: 'L3 (10q, 30min)' },
  { value: 'L4', label: 'L4 (10q, 30min)' },
];

function toLocalDateTimeValue(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditInterviewClient({ interviewId, isExpired, initialData }: EditInterviewClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<EditFormData>({
    jdTitle: initialData.jdTitle ?? '',
    jdText: initialData.jdText ?? '',
    focusAreas: initialData.focusAreas ?? '',
    interviewMode: initialData.interviewMode ?? 'SCREENING',
    customDurationMinutes: initialData.customDurationMinutes ?? null,
    roundName: initialData.roundName ?? '',
    includeProgrammingQuestions: initialData.includeProgrammingQuestions ?? true,
    scheduledAt: toLocalDateTimeValue(initialData.scheduledAt),
    expiresAt: toLocalDateTimeValue(initialData.expiresAt),
  });

  const handleChange = (field: keyof EditFormData, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        jdTitle: formData.jdTitle || undefined,
        jdText: formData.jdText || undefined,
        focusAreas: formData.focusAreas || undefined,
        interviewMode: formData.interviewMode || undefined,
        customDurationMinutes: formData.customDurationMinutes,
        roundName: formData.roundName || undefined,
        includeProgrammingQuestions: formData.includeProgrammingQuestions,
      };
      if (formData.scheduledAt) payload.scheduledAt = new Date(formData.scheduledAt).toISOString();
      if (formData.expiresAt) payload.expiresAt = new Date(formData.expiresAt).toISOString();

      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast('Interview updated successfully', 'success');
        router.push(`/admin/interviews/${interviewId}/review`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? 'Failed to update interview', 'error');
      }
    } catch {
      toast('Error updating interview', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/interviews/${interviewId}/review`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to review
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit interview</h1>
      </div>

      {isExpired && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          This interview has expired. Set a new <span className="font-semibold">Expires at</span> date in the future to re-open access for the candidate. The status will automatically change back to Scheduled.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="jdTitle">JD Title</Label>
              <Input
                id="jdTitle"
                value={formData.jdTitle}
                onChange={e => handleChange('jdTitle', e.target.value)}
                placeholder="e.g. Senior React Developer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jdText">JD Text</Label>
              <Textarea
                id="jdText"
                value={formData.jdText}
                onChange={e => handleChange('jdText', e.target.value)}
                rows={6}
                placeholder="Paste the job description here…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="focusAreas">Focus Areas</Label>
              <Input
                id="focusAreas"
                value={formData.focusAreas}
                onChange={e => handleChange('focusAreas', e.target.value)}
                placeholder="e.g. React, TypeScript, System Design"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interview Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Interview Mode</Label>
                <Select
                  value={formData.interviewMode}
                  onValueChange={v => handleChange('interviewMode', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={120}
                  value={formData.customDurationMinutes ?? ''}
                  onChange={e => handleChange('customDurationMinutes', parseInt(e.target.value) || null)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="roundName">Round Name</Label>
              <Input
                id="roundName"
                value={formData.roundName}
                onChange={e => handleChange('roundName', e.target.value)}
                placeholder="e.g. Hands-On, Technical Screen"
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 cursor-pointer dark:border-zinc-800 dark:bg-zinc-900/50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                checked={formData.includeProgrammingQuestions}
                onChange={e => handleChange('includeProgrammingQuestions', e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Include programming questions</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  When enabled, the interview may include a coding slot with a code editor.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule &amp; Expiry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">Available from</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={e => handleChange('scheduledAt', e.target.value)}
                />
                <p className="text-xs text-zinc-500">Candidate cannot access before this time</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expires at</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={e => handleChange('expiresAt', e.target.value)}
                />
                <p className="text-xs text-zinc-500">Link becomes inaccessible after this time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={`/admin/interviews/${interviewId}/review`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
