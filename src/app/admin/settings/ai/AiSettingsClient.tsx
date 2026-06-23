'use client';

import { useEffect, useState } from 'react';

type Provider = 'claude' | 'ollama';

type LlmSettings = {
  mode: 'hybrid' | 'single';
  claudeConfigured: boolean;
  ollamaConfigured: boolean;
  questionProvider: Provider;
  rubricProvider: Provider;
  assessmentProvider: Provider;
  matchingProvider: Provider;
};

type Operation = keyof Pick<LlmSettings, 'questionProvider' | 'rubricProvider' | 'assessmentProvider' | 'matchingProvider'>;

const OPERATION_META: Record<Operation, { label: string; description: string; claudeModel: string; ollamaModel: string }> = {
  questionProvider: {
    label: 'Interview Questions',
    description: 'Generates the next question based on the candidate\'s answer and interview context.',
    claudeModel: 'claude-haiku-4-5',
    ollamaModel: 'qwen2.5:14b',
  },
  rubricProvider: {
    label: 'Rubric Generation',
    description: 'Builds the evaluation rubric and candidate profile from the JD and resume before the interview.',
    claudeModel: 'claude-haiku-4-5',
    ollamaModel: 'qwen2.5:14b',
  },
  assessmentProvider: {
    label: 'Interview Assessment',
    description: 'Runs the 4-stage scoring pipeline (evidence → category scores → behavioral signals → feedback) after the interview.',
    claudeModel: 'claude-sonnet-4-6',
    ollamaModel: 'qwen2.5:14b',
  },
  matchingProvider: {
    label: 'AI Candidate Matching',
    description: 'Ranks candidates against a JD using interview evidence, resume claims, and experience signals.',
    claudeModel: 'claude-haiku-4-5',
    ollamaModel: 'qwen2.5:14b',
  },
};

const PROVIDER_META = {
  claude: { label: 'Claude (Anthropic)', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200', dot: 'bg-violet-500' },
  ollama: { label: 'Ollama (self-hosted)', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200', dot: 'bg-emerald-500' },
};

export default function AiSettingsClient() {
  const [settings, setSettings] = useState<LlmSettings | null>(null);
  const [draft, setDraft] = useState<Partial<LlmSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json() as LlmSettings & { error?: string };
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load AI settings');
      setSettings(data);
      setDraft({
        questionProvider:   data.questionProvider,
        rubricProvider:     data.rubricProvider,
        assessmentProvider: data.assessmentProvider,
        matchingProvider:   data.matchingProvider,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const setProvider = (op: Operation, value: Provider) => {
    setDraft((prev) => ({ ...prev, [op]: value }));
    setMessage(null);
    setError(null);
  };

  const setAll = (value: Provider) => {
    setDraft({
      questionProvider:   value,
      rubricProvider:     value,
      assessmentProvider: value,
      matchingProvider:   value,
    });
    setMessage(null);
    setError(null);
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json() as LlmSettings & { error?: string };
      if (!res.ok) throw new Error(data?.error ?? 'Failed to save settings');
      setSettings(data);
      setDraft({
        questionProvider:   data.questionProvider,
        rubricProvider:     data.rubricProvider,
        assessmentProvider: data.assessmentProvider,
        matchingProvider:   data.matchingProvider,
      });
      setMessage('AI routing settings updated. New operations use these providers immediately — no restart needed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Loading AI settings…</div>
    );
  }

  const isSingleMode = settings?.mode === 'single';

  return (
    <div className="w-full space-y-6">

      {/* Status bar */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Provider status</h2>
        <div className="flex flex-wrap gap-3">
          {(['claude', 'ollama'] as Provider[]).map((p) => {
            const isConfigured = p === 'claude' ? settings?.claudeConfigured : settings?.ollamaConfigured;
            return (
              <div key={p} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${isConfigured ? PROVIDER_META[p].dot : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{PROVIDER_META[p].label}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isConfigured ? PROVIDER_META[p].badge : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                  {isConfigured ? 'configured' : 'not configured'}
                </span>
              </div>
            );
          })}
        </div>
        {isSingleMode && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            The AI service is running in single-provider mode. Set <code className="font-mono">APP_LLM_PROVIDER=hybrid</code> and restart to enable per-operation routing.
          </p>
        )}
      </div>

      {/* Quick presets */}
      {!isSingleMode && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Quick presets</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Apply a preset, then fine-tune individual operations below.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setProvider('questionProvider', 'ollama'); setProvider('rubricProvider', 'ollama'); setProvider('assessmentProvider', 'claude'); setProvider('matchingProvider', 'claude'); }}
              className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
            >
              Recommended hybrid
              <span className="ml-2 text-xs text-zinc-400">Questions+Rubric→Ollama · Assessment+Matching→Claude</span>
            </button>
            <button
              type="button"
              onClick={() => setAll('claude')}
              className="px-4 py-2 text-sm rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors font-medium"
            >
              All Claude
            </button>
            <button
              type="button"
              onClick={() => setAll('ollama')}
              className="px-4 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors font-medium"
            >
              All Ollama
            </button>
          </div>
        </div>
      )}

      {/* Per-operation routing */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Per-operation routing</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
          Changes take effect immediately for all new operations — running interviews are not interrupted.
        </p>

        <div className="space-y-3">
          {(Object.entries(OPERATION_META) as [Operation, typeof OPERATION_META[Operation]][]).map(([op, meta]) => {
            const current = (draft[op] ?? settings?.[op] ?? 'ollama') as Provider;
            return (
              <div
                key={op}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{meta.label}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{meta.description}</div>
                  </div>

                  {/* Toggle */}
                  <div className="flex shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    {(['ollama', 'claude'] as Provider[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={isSingleMode}
                        onClick={() => setProvider(op, p)}
                        className={`px-4 py-2 text-xs font-semibold transition-colors ${
                          current === p
                            ? p === 'claude'
                              ? 'bg-violet-600 text-white'
                              : 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        } ${isSingleMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {p === 'claude' ? 'Claude' : 'Ollama'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model info */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    <span className="font-medium">Ollama model:</span>{' '}
                    <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{meta.ollamaModel}</code>
                  </span>
                  <span>·</span>
                  <span>
                    <span className="font-medium">Claude model:</span>{' '}
                    <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{meta.claudeModel}</code>
                  </span>
                  <span>·</span>
                  <span>
                    Active:{' '}
                    <span className={`font-semibold ${current === 'claude' ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {current === 'claude' ? meta.claudeModel : meta.ollamaModel}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving || isSingleMode}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save routing'}
          </button>
          <button
            type="button"
            onClick={() => void fetchSettings()}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Reload
          </button>
        </div>

        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Settings are in-memory and reset to application.yml defaults on service restart.
          Set <code className="font-mono">APP_LLM_PROVIDER=hybrid</code> in your environment to make hybrid mode the default.
        </p>
      </div>
    </div>
  );
}
