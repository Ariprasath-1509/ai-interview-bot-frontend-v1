'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Save, Send, Shield } from 'lucide-react';

export type ClientBriefData = {
  executiveSummary: string;
  keyStrengths: string[];
  areasToNote: string[];
  technicalFit: {
    overall: string;
    highlights: string[];
    gaps: string[];
  };
  interviewPerformance: {
    communication: string;
    problemSolving: string;
    overallRating: string;
  };
  recommendation: string;
  recommendedFor: string;
  suggestedNextStep: string;
  source?: string;
  saved?: boolean;
  lastEditedByName?: string;
  lastEditedAt?: string;
};

type ClientBriefContext = {
  candidateName: string;
  candidateEmail: string;
  jdTitle: string;
  interviewDate: string;
  interviewMode: string;
  verdict: string | null;
  skillSet: string | null;
  yoeActual: number | null;
  yoePortrayed: number | null;
};

const EMPTY_BRIEF: ClientBriefData = {
  executiveSummary: '',
  keyStrengths: [''],
  areasToNote: [''],
  technicalFit: { overall: 'Adequate', highlights: [''], gaps: [''] },
  interviewPerformance: {
    communication: '',
    problemSolving: '',
    overallRating: 'Adequate',
  },
  recommendation: 'RECOMMENDED_WITH_CONDITIONS',
  recommendedFor: '',
  suggestedNextStep: '',
};

function normalizeBrief(raw: Partial<ClientBriefData> | undefined | null): ClientBriefData {
  if (!raw) return { ...EMPTY_BRIEF };
  return {
    executiveSummary: raw.executiveSummary ?? '',
    keyStrengths: raw.keyStrengths?.length ? raw.keyStrengths : [''],
    areasToNote: raw.areasToNote?.length ? raw.areasToNote : [''],
    technicalFit: {
      overall: raw.technicalFit?.overall ?? 'Adequate',
      highlights: raw.technicalFit?.highlights?.length ? raw.technicalFit.highlights : [''],
      gaps: raw.technicalFit?.gaps?.length ? raw.technicalFit.gaps : [''],
    },
    interviewPerformance: {
      communication: raw.interviewPerformance?.communication ?? '',
      problemSolving: raw.interviewPerformance?.problemSolving ?? '',
      overallRating: raw.interviewPerformance?.overallRating ?? 'Adequate',
    },
    recommendation: raw.recommendation ?? 'RECOMMENDED_WITH_CONDITIONS',
    recommendedFor: raw.recommendedFor ?? '',
    suggestedNextStep: raw.suggestedNextStep ?? '',
    source: raw.source,
    saved: raw.saved,
    lastEditedByName: raw.lastEditedByName,
    lastEditedAt: raw.lastEditedAt,
  };
}

function cleanList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

function payloadFromBrief(brief: ClientBriefData): ClientBriefData {
  return {
    ...brief,
    keyStrengths: cleanList(brief.keyStrengths),
    areasToNote: cleanList(brief.areasToNote),
    technicalFit: {
      ...brief.technicalFit,
      highlights: cleanList(brief.technicalFit.highlights),
      gaps: cleanList(brief.technicalFit.gaps),
    },
  };
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            className="input-base flex-1"
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            disabled={items.length <= 1}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
        Add item
      </Button>
    </div>
  );
}

export function ClientBriefPanel({ interviewId }: { interviewId: string }) {
  const [brief, setBrief] = useState<ClientBriefData>(EMPTY_BRIEF);
  const [context, setContext] = useState<ClientBriefContext | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);
  const [dirty, setDirty] = useState(false);

  const checkSavedBrief = useCallback(async () => {
    setCheckingSaved(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/client-brief`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check client brief');
      setContext(data.context ?? null);
      if (data.brief && (data.hasSavedBrief || data.brief.saved)) {
        setBrief(normalizeBrief(data.brief));
        setSavedOnce(true);
        setVisible(true);
        setDirty(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setCheckingSaved(false);
    }
  }, [interviewId]);

  useEffect(() => {
    checkSavedBrief();
  }, [checkSavedBrief]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/client-brief/generate`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate client brief');
      setBrief(normalizeBrief(data.brief));
      setContext(data.context ?? null);
      setSavedOnce(false);
      setDirty(true);
      setVisible(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const updateBrief = (patch: Partial<ClientBriefData>) => {
    setBrief((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/client-brief`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromBrief(brief)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setBrief(normalizeBrief(data.brief));
      setSavedOnce(true);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/client-brief/download`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(context?.candidateName ?? 'Candidate').replace(/\s+/g, '_')}_Client_Evaluation_Brief.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (checkingSaved) {
    return (
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-zinc-600">Checking client brief…</span>
      </div>
    );
  }

  if (!visible) {
    return (
      <div className="mt-6 rounded-xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900/40 dark:bg-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-200">
              <Shield className="h-5 w-5" />
              Client Evaluation Brief
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Generate a professional summary when you are ready to share feedback with the client.
            </p>
          </div>
          <Button type="button" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {generating ? 'Generating…' : 'Generate Client Brief'}
          </Button>
        </div>
        {generating && (
          <p className="mt-3 text-xs text-zinc-500">
            AI is drafting the client brief — this usually takes about 1 minute.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  const canDownload = savedOnce && !dirty;

  return (
    <div className="mt-6 rounded-xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900/40 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-200">
            <Shield className="h-5 w-5" />
            Client Evaluation Brief
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Review and edit before sharing with the client. Save, then download the PDF.
          </p>
          {context && (
            <p className="mt-2 text-xs text-zinc-500">
              {context.candidateName} · {context.jdTitle}
              {brief.lastEditedByName ? ` · Last saved by ${brief.lastEditedByName}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!savedOnce && (
            <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Regenerate
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button type="button" onClick={handleDownload} disabled={!canDownload || downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {!canDownload && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          {dirty
            ? 'You have unsaved changes. Save before downloading the PDF.'
            : 'Review and save the brief before downloading the client PDF.'}
        </p>
      )}

      <div className="mt-5 grid gap-5">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Executive Summary</span>
          <textarea
            className="input-base min-h-[120px]"
            value={brief.executiveSummary}
            onChange={(e) => updateBrief({ executiveSummary: e.target.value })}
            placeholder="Professional overview of the candidate's fit for the role…"
          />
        </label>

        <div className="grid gap-5 lg:grid-cols-2">
          <ListEditor
            label="Key Strengths"
            items={brief.keyStrengths}
            onChange={(keyStrengths) => updateBrief({ keyStrengths })}
            placeholder="Evidence-based strength for the client"
          />
          <ListEditor
            label="Areas to Note"
            items={brief.areasToNote}
            onChange={(areasToNote) => updateBrief({ areasToNote })}
            placeholder="Professional consideration (not harsh criticism)"
          />
        </div>

        <div className="grid gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h4 className="text-sm font-semibold">Technical Fit</h4>
          <label className="grid gap-1.5 text-sm">
            Overall
            <select
              className="input-base max-w-xs"
              value={brief.technicalFit.overall}
              onChange={(e) =>
                updateBrief({
                  technicalFit: { ...brief.technicalFit, overall: e.target.value },
                })
              }
            >
              <option value="Strong">Strong</option>
              <option value="Adequate">Adequate</option>
              <option value="Developing">Developing</option>
            </select>
          </label>
          <ListEditor
            label="Alignment Highlights"
            items={brief.technicalFit.highlights}
            onChange={(highlights) =>
              updateBrief({ technicalFit: { ...brief.technicalFit, highlights } })
            }
            placeholder="Technical alignment with JD"
          />
          <ListEditor
            label="Development Areas"
            items={brief.technicalFit.gaps}
            onChange={(gaps) => updateBrief({ technicalFit: { ...brief.technicalFit, gaps } })}
            placeholder="Gap framed professionally"
          />
        </div>

        <div className="grid gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 lg:grid-cols-3">
          <h4 className="text-sm font-semibold lg:col-span-3">Interview Performance</h4>
          <label className="grid gap-1.5 text-sm">
            Communication
            <textarea
              className="input-base min-h-[80px]"
              value={brief.interviewPerformance.communication}
              onChange={(e) =>
                updateBrief({
                  interviewPerformance: { ...brief.interviewPerformance, communication: e.target.value },
                })
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Problem Solving
            <textarea
              className="input-base min-h-[80px]"
              value={brief.interviewPerformance.problemSolving}
              onChange={(e) =>
                updateBrief({
                  interviewPerformance: { ...brief.interviewPerformance, problemSolving: e.target.value },
                })
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Overall Rating
            <select
              className="input-base"
              value={brief.interviewPerformance.overallRating}
              onChange={(e) =>
                updateBrief({
                  interviewPerformance: { ...brief.interviewPerformance, overallRating: e.target.value },
                })
              }
            >
              <option value="Strong">Strong</option>
              <option value="Adequate">Adequate</option>
              <option value="Developing">Developing</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            Recommendation
            <select
              className="input-base"
              value={brief.recommendation}
              onChange={(e) => updateBrief({ recommendation: e.target.value })}
            >
              <option value="RECOMMENDED">Recommended</option>
              <option value="RECOMMENDED_WITH_CONDITIONS">Recommended with Conditions</option>
              <option value="NOT_RECOMMENDED">Not Recommended</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm lg:col-span-2">
            Recommended For
            <input
              className="input-base"
              value={brief.recommendedFor}
              onChange={(e) => updateBrief({ recommendedFor: e.target.value })}
              placeholder="e.g. Mid-level Java backend role with Spring Boot"
            />
          </label>
          <label className="grid gap-1.5 text-sm lg:col-span-3">
            Suggested Next Step
            <input
              className="input-base"
              value={brief.suggestedNextStep}
              onChange={(e) => updateBrief({ suggestedNextStep: e.target.value })}
              placeholder="e.g. Proceed to client technical round"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
