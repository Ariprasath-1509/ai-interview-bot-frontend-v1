'use client';

import { useState, useEffect } from 'react';

interface TokenAnalytics {
  totalTokens: number;
  totalCost: number;
  totalOperations?: number;
  operationBreakdown: Record<string, number>;
}

interface TokenLimits {
  dailyLimit: number;
  warningThreshold: number;
}

export default function TokenSettingsClient() {
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null);
  const [limits, setLimits] = useState<TokenLimits>({
    dailyLimit: 100000,
    warningThreshold: 80000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/tokens/analytics/daily');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch token analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLimits = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/tokens/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(limits)
      });

      if (response.ok) {
        alert('Token limits updated successfully!');
      } else {
        alert('Failed to update token limits');
      }
    } catch (error) {
      alert('Error updating token limits');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading token settings...</div>;
  }

  const inputCls = "w-full p-3 border rounded-lg bg-white dark:bg-black dark:border-zinc-800 text-zinc-900 dark:text-zinc-100";

  return (
    <div className="w-full space-y-6">
      {/* Daily Analytics */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Today's Usage</h2>
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {analytics.totalTokens.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-zinc-500 mt-1">Total Tokens</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                ${analytics.totalCost.toFixed(2)}
              </div>
              <div className="text-sm font-medium text-zinc-500 mt-1">Estimated Cost</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {analytics.totalOperations || Object.values(analytics.operationBreakdown).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-sm font-medium text-zinc-500 mt-1">API Calls</div>
            </div>
          </div>
        )}

        {/* Operation Breakdown */}
        {analytics && Object.keys(analytics.operationBreakdown).length > 0 && (
          <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            <h3 className="font-medium mb-4 text-zinc-900 dark:text-zinc-100">Operation Breakdown</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(analytics.operationBreakdown).map(([operation, count]) => (
                <div key={operation} className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800">
                  <span className="capitalize text-sm font-medium text-zinc-700 dark:text-zinc-300">{operation}</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Limit Configuration */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Daily Limits Configuration</h2>
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-100">
              Daily Token Limit
            </label>
            <input
              type="number"
              value={limits.dailyLimit}
              onChange={(e) => setLimits(prev => ({
                ...prev,
                dailyLimit: parseInt(e.target.value) || 0
              }))}
              className={inputCls}
              min="1000"
              step="1000"
            />
            <p className="text-sm text-zinc-500 mt-2">
              Hard limit - interviews will be blocked when exceeded to prevent unexpected costs.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-100">
              Warning Threshold
            </label>
            <input
              type="number"
              value={limits.warningThreshold}
              onChange={(e) => setLimits(prev => ({
                ...prev,
                warningThreshold: parseInt(e.target.value) || 0
              }))}
              className={inputCls}
              min="1000"
              step="1000"
            />
            <p className="text-sm text-zinc-500 mt-2">
              Show visual warnings on the dashboard when this threshold is reached.
            </p>
          </div>

          <button
            onClick={updateLimits}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Update Limits'}
          </button>
        </div>
      </div>

      {/* Cost Estimation Guide */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200 dark:border-blue-900/30">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">Cost Estimation Reference</h3>
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2 leading-relaxed">
          <p>• <strong className="font-semibold">AI Fast:</strong> ~$0.25 per 1M tokens (used for question generation and rubric extraction)</p>
          <p>• <strong className="font-semibold">AI Advanced:</strong> ~$3.00 per 1M tokens (used for final candidate assessments and scoring)</p>
          <p>• <strong className="font-semibold">Average interview:</strong> ~2,000-5,000 tokens per session</p>
          <p>• <strong className="font-semibold">Budgeting:</strong> A daily limit of 100K tokens translates to approximately $0.30 - $0.50 estimated daily cost, supporting roughly 20-30 interviews.</p>
        </div>
      </div>
    </div>
  );
}
