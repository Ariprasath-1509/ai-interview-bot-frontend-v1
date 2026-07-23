'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw, Save, Send, Shield } from 'lucide-react';
import { authFetch } from '@/lib/clientFetch';

export type SkillSummary = {
  rank: number;
  categoryKey: string;
  skill: string;
  subSkill: string;
  score10: number;
  note: string;
};

export type SkillMapping = {
  skill: string;
  subSkill: string;
  categoryKey: string;
};

export type QuestionAsked = {
  number: number;
  difficulty: string;
  text: string;
  answer?: string;
  type: string;
  skillMappings: SkillMapping[];
};

export type SkillAssessment = {
  rank: number;
  categoryKey: string;
  skill: string;
  subSkill: string;
  score10: number;
  proficiencyOptions: string[];
  selectedProficiencyIndex: number;
  strengths: string[];
  areasOfImprovement: string[];
};

export type BriefHeader = {
  candidateName?: string;
  candidateEmail?: string;
  positionTitle?: string;
  clientName?: string;
  roundName?: string;
  seniorityBand?: string;
  interviewDate?: string;
  totalMinutes?: number;
  playbackUrl?: string;
  resumeUrl?: string;
  reviewer?: {
    name?: string;
    yearsExperience?: string;
    company?: string;
    verifiedSkills?: string[];
  };
};

export type ClientBriefData = {
  header?: BriefHeader;
  mustHaveSkills: SkillSummary[];
  goodToHaveSkills: SkillSummary[];
  questionsAsked: QuestionAsked[];
  overallFeedback: string;
  generationWarning?: string;
  skillAssessments: SkillAssessment[];
  source?: string;
  saved?: boolean;
  lastEditedByName?: string;
  lastEditedAt?: string;
};

type ClientBriefContext = {
  candidateName: string;
  candidateEmail: string;
  jdTitle: string;
  clientName?: string;
  interviewDate: string;
  interviewMode: string;
  roundName?: string;
  seniorityBand?: string;
  totalMinutes?: number | null;
  verdict: string | null;
  skillSet: string | null;
  yoeActual: number | null;
  yoePortrayed: number | null;
  reviewerName?: string;
  reviewerYoe?: string;
  reviewerCompany?: string;
  reviewerSkills?: string[];
  playbackUrl?: string;
  resumeUrl?: string;
};

const EMPTY_BRIEF: ClientBriefData = {
  mustHaveSkills: [],
  goodToHaveSkills: [],
  questionsAsked: [],
  overallFeedback: '',
  skillAssessments: [],
};

function isLegacyBrief(raw: Record<string, unknown>): boolean {
  return (
    ('executiveSummary' in raw || 'keyStrengths' in raw || 'technicalFit' in raw) &&
    !('mustHaveSkills' in raw) &&
    !('skillAssessments' in raw)
  );
}

function isNewFormatBrief(raw: Record<string, unknown>): boolean {
  return 'mustHaveSkills' in raw || 'skillAssessments' in raw || 'overallFeedback' in raw;
}

function normalizeBrief(raw: Partial<ClientBriefData> | undefined | null): ClientBriefData {
  if (!raw) return { ...EMPTY_BRIEF };
  const record = raw as Record<string, unknown>;
  if (isLegacyBrief(record)) {
    return { ...EMPTY_BRIEF, source: raw.source, saved: raw.saved, lastEditedByName: raw.lastEditedByName, lastEditedAt: raw.lastEditedAt };
  }
  if (!isNewFormatBrief(record)) {
    return { ...EMPTY_BRIEF, source: raw.source, saved: raw.saved, lastEditedByName: raw.lastEditedByName, lastEditedAt: raw.lastEditedAt };
  }
  return {
    header: raw.header,
    mustHaveSkills: raw.mustHaveSkills ?? [],
    goodToHaveSkills: raw.goodToHaveSkills ?? [],
    questionsAsked: raw.questionsAsked ?? [],
    overallFeedback: raw.overallFeedback ?? '',
    generationWarning: raw.generationWarning,
    skillAssessments: raw.skillAssessments ?? [],
    source: raw.source,
    saved: raw.saved,
    lastEditedByName: raw.lastEditedByName,
    lastEditedAt: raw.lastEditedAt,
  };
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950">
      <div className="h-full rounded-full bg-violet-600" style={{ width: `${pct}%` }} />
    </div>
  );
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
  const safeItems = items.length ? items : [''];
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {safeItems.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            className="input-base flex-1"
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...safeItems];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(safeItems.filter((_, i) => i !== index))}
            disabled={safeItems.length <= 1}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...safeItems, ''])}>
        Add item
      </Button>
    </div>
  );
}

function SkillSummarySection({
  title,
  skills,
}: {
  title: string;
  skills: SkillSummary[];
}) {
  if (!skills.length) {
    return (
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-200">{title}</h4>
        <p className="mt-2 text-sm text-zinc-500">No skills in this group.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h4 className="mb-4 text-sm font-semibold text-violet-900 dark:text-violet-200">{title}</h4>
      <div className="space-y-4">
        {skills.map((s) => (
          <div key={`${s.categoryKey}-${s.rank}`}>
            <div className="text-sm font-semibold">
              {s.rank}. {s.skill} — {s.subSkill}{' '}
              <span className="text-violet-700 dark:text-violet-300">({s.score10}/10)</span>
            </div>
            {s.note ? <p className="mt-1 text-xs text-zinc-500">{s.note}</p> : null}
            <div className="mt-2">
              <ScoreBar score={s.score10} />
            </div>
          </div>
        ))}
      </div>
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
  const [legacySaved, setLegacySaved] = useState(false);

  const checkSavedBrief = useCallback(async () => {
    setCheckingSaved(true);
    setError(null);
    try {
      const res = await authFetch(`/api/interviews/${interviewId}/client-brief`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check client brief');
      setContext(data.context ?? null);
      if (data.brief && (data.hasSavedBrief || data.brief.saved)) {
        const raw = data.brief as Record<string, unknown>;
        setLegacySaved(isLegacyBrief(raw));
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
      const res = await authFetch(`/api/interviews/${interviewId}/client-brief/generate`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate client brief');
      setLegacySaved(false);
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

  const updateAssessment = (index: number, patch: Partial<SkillAssessment>) => {
    setBrief((prev) => {
      const next = [...prev.skillAssessments];
      next[index] = { ...next[index], ...patch };
      return { ...prev, skillAssessments: next };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...brief,
        skillAssessments: brief.skillAssessments.map((a) => ({
          ...a,
          strengths: a.strengths.map((s) => s.trim()).filter(Boolean),
          areasOfImprovement: a.areasOfImprovement.map((s) => s.trim()).filter(Boolean),
        })),
      };
      const res = await authFetch(`/api/interviews/${interviewId}/client-brief`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setLegacySaved(false);
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
      const res = await authFetch(`/api/interviews/${interviewId}/client-brief/download`, {
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
              Generate a skill-based client report after AI assessment is complete.
            </p>
          </div>
          <Button type="button" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {generating ? 'Generating…' : 'Generate Client Brief'}
          </Button>
        </div>
        {generating && (
          <p className="mt-3 text-xs text-zinc-500">
            AI is drafting the client brief — this usually takes 1–3 minutes. Please keep this tab open.
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

  const header = brief.header ?? {};
  const reviewer = header.reviewer ?? {};
  const canDownload = savedOnce && !dirty;
  const hasBody =
    brief.mustHaveSkills.length > 0 ||
    brief.goodToHaveSkills.length > 0 ||
    brief.questionsAsked.length > 0 ||
    !!brief.overallFeedback.trim() ||
    brief.skillAssessments.length > 0;

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
          <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {generating ? 'Regenerating…' : 'Regenerate'}
          </Button>
          <Button type="button" variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          <Button type="button" onClick={handleDownload} disabled={!canDownload || downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {(legacySaved || brief.generationWarning) && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {legacySaved
            ? 'This interview has an older saved brief format. Click Regenerate to create the new skill-based report.'
            : brief.generationWarning}
        </p>
      )}

      {!hasBody && !legacySaved && !brief.generationWarning && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          The brief has no skill content yet. Re-run AI assessment if needed, then click Regenerate.
        </p>
      )}

      {!canDownload && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          {dirty
            ? 'You have unsaved changes. Save before downloading the PDF.'
            : 'Review and save the brief before downloading the client PDF.'}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-xl bg-gradient-to-br from-[#382060] to-[#764ba2] p-5 text-white">
        <div className="text-[11px] font-bold tracking-widest opacity-90">BENCH READINESS</div>
        <h3 className="mt-2 text-2xl font-bold">
          {header.candidateName || context?.candidateName || 'Candidate'}
        </h3>
        <div className="mt-3 grid gap-2 text-sm opacity-95 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <strong>Position:</strong> {header.positionTitle || context?.jdTitle || '—'}
          </div>
          <div>
            <strong>Client:</strong> {header.clientName || context?.clientName || '—'}
          </div>
          <div>
            <strong>Round:</strong> {header.roundName || context?.roundName || '—'}
          </div>
          <div>
            <strong>Seniority:</strong> {header.seniorityBand || context?.seniorityBand || '—'}
          </div>
          <div>
            <strong>Date:</strong> {header.interviewDate || context?.interviewDate || '—'}
          </div>
          <div>
            <strong>Duration:</strong>{' '}
            {header.totalMinutes ?? context?.totalMinutes ? `${header.totalMinutes ?? context?.totalMinutes} min` : '—'}
          </div>
        </div>
        <div className="mt-4 border-t border-white/20 pt-4 text-sm">
          <strong>Reviewed by:</strong> {reviewer.name || context?.reviewerName || '—'}
          {reviewer.yearsExperience || context?.reviewerYoe
            ? ` · ${reviewer.yearsExperience || context?.reviewerYoe} yrs`
            : ''}
          {reviewer.company || context?.reviewerCompany
            ? ` at ${reviewer.company || context?.reviewerCompany}`
            : ''}
          {(reviewer.verifiedSkills?.length || context?.reviewerSkills?.length) ? (
            <div className="mt-1 text-xs opacity-90">
              {(reviewer.verifiedSkills ?? context?.reviewerSkills ?? []).map((s) => `✓ ${s}`).join('   ')}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SkillSummarySection title="Must have" skills={brief.mustHaveSkills} />
        <SkillSummarySection title="Good to have" skills={brief.goodToHaveSkills} />
      </div>

      <div className="mt-5 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h4 className="mb-4 text-sm font-semibold text-violet-900 dark:text-violet-200">Questions asked</h4>
        {!brief.questionsAsked.length ? (
          <p className="text-sm text-zinc-500">No questions recorded.</p>
        ) : (
          <div className="space-y-3">
            {brief.questionsAsked.map((q) => (
              <div
                key={q.number}
                className="rounded-lg border border-violet-100 bg-violet-50/60 p-3 dark:border-violet-900/40 dark:bg-violet-950/20"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <strong className="text-sm">Question {q.number}</strong>
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {q.difficulty || 'Medium'}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{q.text}</p>
                {q.answer?.trim() ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Candidate&apos;s answer</p>
                    <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{q.answer}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs italic text-zinc-400">No answer recorded.</p>
                )}
                {q.skillMappings?.length ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    {q.skillMappings.map((m) => `${m.skill}: ${m.subSkill}`).join('   |   ')}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="mt-5 grid gap-2 text-sm">
        <span className="font-medium">Overall feedback</span>
        <textarea
          className="input-base min-h-[120px]"
          value={brief.overallFeedback}
          onChange={(e) => updateBrief({ overallFeedback: e.target.value })}
          placeholder="Balanced overview for the client…"
        />
      </label>

      <div className="mt-5 space-y-5">
        <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-200">Detailed skill assessment</h4>
        {!brief.skillAssessments.length ? (
          <p className="text-sm text-zinc-500">No detailed assessments.</p>
        ) : (
          brief.skillAssessments.map((assessment, index) => (
            <div key={`${assessment.categoryKey}-${assessment.rank}`} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-sm font-semibold">
                {assessment.rank}. {assessment.skill} — {assessment.subSkill}{' '}
                <span className="text-violet-700 dark:text-violet-300">({assessment.score10}/10)</span>
              </div>
              <div className="mt-3 space-y-2">
                {(assessment.proficiencyOptions ?? []).map((opt, optIndex) => (
                  <label key={optIndex} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name={`proficiency-${assessment.categoryKey}`}
                      checked={assessment.selectedProficiencyIndex === optIndex}
                      onChange={() => updateAssessment(index, { selectedProficiencyIndex: optIndex })}
                      className="mt-1"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ListEditor
                  label="Strengths"
                  items={assessment.strengths?.length ? assessment.strengths : ['']}
                  onChange={(strengths) => updateAssessment(index, { strengths })}
                  placeholder="Strength bullet"
                />
                <ListEditor
                  label="Areas of improvement"
                  items={assessment.areasOfImprovement?.length ? assessment.areasOfImprovement : ['']}
                  onChange={(areasOfImprovement) => updateAssessment(index, { areasOfImprovement })}
                  placeholder="Improvement bullet"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
