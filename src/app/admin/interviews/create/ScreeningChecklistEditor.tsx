'use client';

import { useState } from 'react';

type ChecklistDimension = { key: string; label: string; weightPct: number; goodLooksLike: string };
type RecommendationBand = { min: number; max: number; label: string; action: string };
type RatingScaleLevel = { score: number; definition: string };
type RatingScale = { min: number; max: number; levels: RatingScaleLevel[] };
type ParsedChecklist = {
  dimensions: ChecklistDimension[];
  proceedGates: string[];
  rejectSignals: string[];
  validateFlags: string[];
  knockoutQuestions: string[];
  recommendationBands: RecommendationBand[];
  ratingScale?: RatingScale;
};

interface ScreeningChecklistEditorProps {
  clientId: string;
  clientName: string;
  existingChecklistJson?: string | null;
  existingChecklistName?: string | null;
  onSaved: (checklistJson: string, checklistName: string) => void;
}

function safeParse(json: string): ParsedChecklist | null {
  try {
    return JSON.parse(json) as ParsedChecklist;
  } catch {
    return null;
  }
}

export function ScreeningChecklistEditor({
  clientId,
  clientName,
  existingChecklistJson,
  existingChecklistName,
  onSaved,
}: ScreeningChecklistEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [checklistText, setChecklistText] = useState('');
  const [checklistName, setChecklistName] = useState(existingChecklistName ?? '');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedChecklist | null>(
    existingChecklistJson ? safeParse(existingChecklistJson) : null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!checklistText.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/parse-screening-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Failed to parse checklist');
      setParsed(data.checklist as ParsedChecklist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse checklist');
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    setError(null);
    try {
      const json = JSON.stringify(parsed);
      const name = checklistName.trim() || `${clientName} Screening Checklist`;
      const res = await fetch(`/api/recruiter/clients/${clientId}/screening-checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screeningChecklistJson: json, screeningChecklistName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save checklist');
      onSaved(json, name);
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  }

  function updateDimensionWeight(idx: number, weightPct: number) {
    if (!parsed) return;
    const dims = [...parsed.dimensions];
    dims[idx] = { ...dims[idx], weightPct };
    setParsed({ ...parsed, dimensions: dims });
  }

  const weightSum = parsed?.dimensions.reduce((s, d) => s + (Number(d.weightPct) || 0), 0) ?? 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Screening Checklist</p>
          <p className="text-xs text-zinc-500 truncate">
            {existingChecklistName
              ? `Using: ${existingChecklistName} — AI will stick to these dimensions and gates`
              : 'No checklist set — AI uses the JD-based auto-generated rubric'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {expanded ? 'Close' : existingChecklistName ? 'Edit checklist' : 'Add checklist'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          {!parsed && (
            <>
              <textarea
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                placeholder="Paste the full screening checklist document here (proceed/reject rules, rating matrix, knockout questions, recommendation bands)..."
                className="w-full min-h-[180px] text-xs font-mono rounded border border-zinc-200 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={() => void handleParse()}
                disabled={parsing || !checklistText.trim()}
                className="rounded-lg bg-blue-600 text-white text-xs font-medium px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {parsing ? 'Parsing…' : 'Parse checklist'}
              </button>
            </>
          )}

          {parsed && (
            <>
              <div>
                <label className="text-xs text-zinc-500">Checklist name</label>
                <input
                  value={checklistName}
                  onChange={(e) => setChecklistName(e.target.value)}
                  placeholder={`${clientName} Screening Checklist`}
                  className="mt-1 w-full text-sm rounded border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 bg-white dark:bg-zinc-950"
                />
              </div>

              {parsed.ratingScale && (
                <div className="text-xs">
                  <p className="font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                    Rating scale ({parsed.ratingScale.min}–{parsed.ratingScale.max})
                  </p>
                  <div className="space-y-0.5 text-zinc-500 dark:text-zinc-400">
                    {parsed.ratingScale.levels.map((l, i) => (
                      <p key={i}>
                        <span className="font-medium">{l.score}</span> = {l.definition}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                  Rating dimensions —{' '}
                  <span className={weightSum === 100 ? 'text-emerald-600' : 'text-amber-600'}>
                    {weightSum}% total{weightSum !== 100 ? ' (should sum to 100%)' : ''}
                  </span>
                </p>
                <div className="space-y-1.5">
                  {parsed.dimensions.map((d, i) => (
                    <div key={d.key} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300" title={d.goodLooksLike}>
                        {d.label}
                      </span>
                      <input
                        type="number"
                        value={d.weightPct}
                        onChange={(e) => updateDimensionWeight(i, Number(e.target.value))}
                        className="w-16 rounded border border-zinc-200 dark:border-zinc-700 px-1.5 py-1 bg-white dark:bg-zinc-950 text-right"
                      />
                      <span className="text-zinc-400">%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-medium mb-1 text-red-700 dark:text-red-400">
                    Reject signals ({parsed.rejectSignals.length})
                  </p>
                  <ul className="list-disc list-inside text-zinc-500 dark:text-zinc-400 space-y-0.5">
                    {parsed.rejectSignals.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1 text-blue-700 dark:text-blue-400">
                    Knockout questions ({parsed.knockoutQuestions.length})
                  </p>
                  <ul className="list-disc list-inside text-zinc-500 dark:text-zinc-400 space-y-0.5">
                    {parsed.knockoutQuestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {parsed.validateFlags.length > 0 && (
                <div className="text-xs">
                  <p className="font-medium mb-1 text-amber-700 dark:text-amber-400">
                    Needs validation ({parsed.validateFlags.length})
                  </p>
                  <ul className="list-disc list-inside text-zinc-500 dark:text-zinc-400 space-y-0.5">
                    {parsed.validateFlags.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.recommendationBands.length > 0 && (
                <div className="text-xs">
                  <p className="font-medium mb-1 text-zinc-700 dark:text-zinc-300">Recommendation bands</p>
                  <div className="space-y-0.5 text-zinc-500 dark:text-zinc-400">
                    {parsed.recommendationBands.map((b, i) => (
                      <p key={i}>
                        {b.min}–{b.max}: <span className="font-medium">{b.label}</span> — {b.action}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 text-white text-xs font-medium px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save to client'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParsed(null);
                    setChecklistText('');
                  }}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium px-3 py-2 text-zinc-600 dark:text-zinc-300"
                >
                  Re-paste / start over
                </button>
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
