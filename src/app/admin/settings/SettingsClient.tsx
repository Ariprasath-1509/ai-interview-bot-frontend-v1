'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import TokenSettingsClient from './tokens/TokenSettingsClient';
import ProctoringSettingsClient from './proctoring/ProctoringSettingsClient';
import AiSettingsClient from './ai/AiSettingsClient';

type Tab = 'tokens' | 'proctoring' | 'ai';

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'tokens',     label: 'Token Settings',     description: 'Daily usage limits and API cost monitoring' },
  { id: 'proctoring', label: 'Proctoring',          description: 'Video proctoring rules per candidate source' },
  { id: 'ai',         label: 'AI Routing',          description: 'Per-operation model provider selection' },
];

function SettingsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab | null) ?? 'tokens';

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full space-y-6">
      {/* Tab bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-0" aria-label="Settings tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`group relative px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active tab description */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 -mt-2">
        {TABS.find((t) => t.id === activeTab)?.description}
      </p>

      {/* Panel */}
      {activeTab === 'tokens'     && <TokenSettingsClient />}
      {activeTab === 'proctoring' && <ProctoringSettingsClient />}
      {activeTab === 'ai'         && <AiSettingsClient />}
    </div>
  );
}

export default function SettingsClient() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <SettingsInner />
    </Suspense>
  );
}
