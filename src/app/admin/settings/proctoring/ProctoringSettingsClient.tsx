'use client';

import { useEffect, useState } from 'react';

type ProctoringSettings = {
  BENCH: boolean;
  B2B: boolean;
  MARKET: boolean;
};

const SOURCE_LABELS: Record<keyof ProctoringSettings, string> = {
  BENCH: 'Bench candidates',
  B2B: 'B2B candidates',
  MARKET: 'Market candidates',
};

const SOURCE_DESCRIPTIONS: Record<keyof ProctoringSettings, string> = {
  BENCH: 'Internal bench engineers taking readiness interviews.',
  B2B: 'Partner or B2B pipeline candidates.',
  MARKET: 'External market-sourced candidates.',
};

export default function ProctoringSettingsClient() {
  const [settings, setSettings] = useState<ProctoringSettings>({
    BENCH: false,
    B2B: false,
    MARKET: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/proctoring-settings');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? 'Failed to load proctoring settings');
      }
      const next = data?.settings ?? data;
      setSettings({
        BENCH: Boolean(next.BENCH),
        B2B: Boolean(next.B2B),
        MARKET: Boolean(next.MARKET),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proctoring settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (source: keyof ProctoringSettings) => {
    setSettings((prev) => ({ ...prev, [source]: !prev[source] }));
    setMessage(null);
    setError(null);
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/proctoring-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? 'Failed to update proctoring settings');
      }
      const next = data?.settings ?? settings;
      setSettings({
        BENCH: Boolean(next.BENCH),
        B2B: Boolean(next.B2B),
        MARKET: Boolean(next.MARKET),
      });
      setMessage('Video proctoring settings saved. New interviews will use these rules immediately.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update proctoring settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading proctoring settings...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Video Proctoring by Candidate Source</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Control whether camera-based video proctoring is required during interviews. When disabled, candidates still use
          fullscreen mode and tab-switch monitoring only.
        </p>

        <div className="space-y-4">
          {(Object.keys(SOURCE_LABELS) as Array<keyof ProctoringSettings>).map((source) => (
            <div
              key={source}
              className="flex items-center justify-between gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40"
            >
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{SOURCE_LABELS[source]}</div>
                <div className="text-sm text-zinc-500 mt-1">{SOURCE_DESCRIPTIONS[source]}</div>
                <div className="text-xs mt-2 text-zinc-500">
                  {settings[source]
                    ? 'Video proctoring enabled (camera, face detection, snapshots)'
                    : 'Light integrity only (fullscreen + tab-switch monitoring)'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings[source]}
                onClick={() => toggleSource(source)}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
                  settings[source] ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    settings[source] ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-green-600">{message}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => void fetchSettings()}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
