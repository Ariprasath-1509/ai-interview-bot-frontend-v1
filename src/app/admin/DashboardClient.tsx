'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { SkeletonDashboard } from '@/components/common/Skeleton';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHero, SectionHeader, StatCard } from '@/components/common/AppUi';
import DashboardTrendsTab, { type TrendsResponse } from '@/app/admin/DashboardTrendsTab';
import DashboardPerformanceTab, { type CandidatePerformanceData } from '@/app/admin/DashboardPerformanceTab';

// Interfaces
interface AnalyticsData {
  statusCounts: { scheduled: number; inProgress: number; completed: number; signedOff: number; reviewPending: number; total: number; };
  timePeriods: { today: number; thisWeek: number; total: number; };
  successMetrics: { readyCount: number; totalAssessed: number; successRate: number; };
  lastUpdated: string;
}

interface TokenData {
  usage: number; limit: number; warningThreshold: number; nearLimit: boolean; overLimit: boolean; remainingTokens: number;
}

interface ModeAnalytics {
  modeDistribution: Record<string, number>;
  totalInterviews: number;
}

interface VerdictAnalytics {
  READY: number; NEEDS_1_WEEK_PREP: number; NEEDS_RESKILLING: number; MISMATCH_WITH_JD: number; WITHDRAWN: number;
}

const VERDICT_FLOW_ORDER = [
  'WITHDRAWN',
  'MISMATCH_WITH_JD',
  'NEEDS_RESKILLING',
  'NEEDS_1_WEEK_PREP',
  'READY',
] as const;

interface CandidateAnalytics extends CandidatePerformanceData {}

interface ClientAnalytics {
  totalClients: number;
  clients: Array<{
    clientId: string;
    clientName: string;
    jdRole: string;
    jdTitle: string;
    benchB2bCandidatesNeeded?: number;
    marketCandidatesNeeded?: number;
    createdAt: string;
  }>;
}

interface Interviewer {
  name: string; interviewCount: number; successRate: number;
}

interface TrendData extends TrendsResponse {}

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [modeAnalytics, setModeAnalytics] = useState<ModeAnalytics | null>(null);
  const [verdicts, setVerdicts] = useState<VerdictAnalytics | null>(null);
  const [candidateAnalytics, setCandidateAnalytics] = useState<CandidateAnalytics | null>(null);
  const [clientAnalytics, setClientAnalytics] = useState<ClientAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [reviewPendingCount, setReviewPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, tokenRes, modeRes, verdictsRes, candidatesRes, clientRes, trendsRes, reviewRes] = await Promise.all([
        fetch('/api/analytics/realtime').catch(() => null),
        fetch('/api/tokens/check-limit').catch(() => null),
        fetch('/api/analytics/modes').catch(() => null),
        fetch('/api/analytics/verdicts').catch(() => null),
        fetch('/api/analytics/candidates').catch(() => null),
        fetch('/api/analytics/clients').catch(() => null),
        fetch('/api/analytics/trends').catch(() => null),
        fetch('/api/interviews/summary').catch(() => null),
      ]);

      if (analyticsRes?.ok) setAnalytics(await analyticsRes.json());
      if (tokenRes?.ok) setTokenData(await tokenRes.json());
      if (modeRes?.ok) setModeAnalytics(await modeRes.json());
      if (verdictsRes?.ok) {
        const vData = await verdictsRes.json();
        let extracted = vData;
        if (vData && typeof vData === 'object' && !vData.READY && Object.values(vData).some(v => typeof v === 'object' && v !== null && 'READY' in v)) {
          extracted = Object.values(vData).find(v => typeof v === 'object' && v !== null && 'READY' in v);
        }
        setVerdicts(
          extracted.verdictDistribution
          || extracted.verdicts
          || extracted.data
          || extracted
        );
      }
      if (candidatesRes?.ok) setCandidateAnalytics(await candidatesRes.json());
      if (clientRes?.ok) setClientAnalytics(await clientRes.json());
      if (trendsRes?.ok) setTrends(await trendsRes.json());
      if (reviewRes?.ok) {
        const summaryData = await reviewRes.json() as Array<{ status?: string }>;
        if (Array.isArray(summaryData)) {
          setReviewPendingCount(summaryData.filter(i => i.status === 'REVIEW_PENDING').length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Don't retry immediately on error - wait for next interval
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchAnalytics, 0);
    const interval = setInterval(fetchAnalytics, 60000); // Increased to 60 seconds
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'status', label: 'Status & Flow' },
    { id: 'performance', label: 'Candidate Performance' },
    { id: 'modes', label: 'Interview Modes' },
    { id: 'trends', label: 'Trends' },
    { id: 'tokens', label: 'Token Usage' }
  ];

  return (
    <div className="space-y-6 max-w-6xl animate-in">
      <PageHero
        icon={LayoutDashboard}
        title="Admin Dashboard"
        description="Monitor interview pipeline, candidate readiness, client positions, and token usage in real time."
      />

      <div className="flex justify-between items-center flex-wrap gap-3">
        {/* Token Usage Alert Summary */}
        <div>
          {tokenData && (tokenData.nearLimit || tokenData.overLimit) && (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${tokenData.overLimit ? 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900/50' : 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-900/50'}`}>
              {tokenData.overLimit ? 'Token limit exceeded' : 'Approaching token limit'} ({tokenData.usage.toLocaleString()} / {tokenData.limit.toLocaleString()})
            </div>
          )}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: {analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'tab-bar-item tab-bar-item-active' : 'tab-bar-item'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      <div className="mt-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Interview Pipeline */}
            <div>
              <SectionHeader
                title="Interview Pipeline"
                description="Current status of all interviews in the system"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard title="Draft" description="Created but not yet scheduled" value={analytics?.statusCounts.scheduled || 0} accent="indigo" linkTo="/admin/review?status=DRAFT" />
                <StatCard title="Scheduled" description="Booked but not yet started" value={analytics?.statusCounts.scheduled || 0} accent="blue" linkTo="/admin/review?status=SCHEDULED" />
                <StatCard title="Review Pending" description="Awaiting manager sign-off" value={reviewPendingCount} accent="yellow" linkTo="/admin/review?status=REVIEW_PENDING" />
                <StatCard title="Completed" description="Fully assessed by AI" value={analytics?.statusCounts.completed || 0} accent="green" linkTo="/admin/review?status=COMPLETED" />
                <StatCard title="Signed Off" description="Final verdict submitted" value={analytics?.statusCounts.signedOff || 0} accent="purple" linkTo="/admin/review?status=SIGNED_OFF" />
              </div>
            </div>

            {/* Activity & Outcomes */}
            <div>
              <SectionHeader
                title="Activity & Outcomes"
                description="Interview volume, client positions, and readiness results"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Interviews Today" description="Created or updated today" value={analytics?.timePeriods.today || 0} accent="indigo" />
                <StatCard title="Interviews This Week" description="Created or updated this week" value={analytics?.timePeriods.thisWeek || 0} accent="teal" />
                <StatCard title="Total Clients" description="Active client positions" value={clientAnalytics?.totalClients || 0} accent="blue" linkTo="/admin/clients" />
                <StatCard title="Bench Readiness Rate" description="Candidates marked Ready out of all assessed" value={`${analytics?.successMetrics.successRate || 0}%`} accent="emerald" subtitle={`${analytics?.successMetrics.readyCount || 0} ready / ${analytics?.successMetrics.totalAssessed || 0} assessed`} />
              </div>
            </div>

            {/* Active Clients */}
            <div>
              <SectionHeader
                title="Active Clients"
                description="Current client positions requiring candidates"
              />
              {clientAnalytics?.clients && clientAnalytics.clients.length > 0 ? (
                <div className="card p-6">
                  <div className="overflow-x-auto">
                    <table className="app-table w-full text-sm text-left">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 font-medium rounded-l-lg">Client</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Requirements</th>
                          <th className="px-4 py-3 font-medium rounded-r-lg">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientAnalytics.clients.map((client, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">{client.clientName}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-zinc-900 dark:text-zinc-100">{client.jdRole || client.jdTitle}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {client.benchB2bCandidatesNeeded && client.benchB2bCandidatesNeeded > 0 && (
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                    {client.benchB2bCandidatesNeeded} Bench/B2B
                                  </span>
                                )}
                                {client.marketCandidatesNeeded && client.marketCandidatesNeeded > 0 && (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                                    {client.marketCandidatesNeeded} Market
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs">
                              {new Date(client.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Link href="/admin/clients" className="text-sm text-blue-600 hover:underline">
                      View all clients →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No active clients</h3>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Create client positions to start matching candidates.</p>
                  <Link href="/admin/clients" className="btn-primary mt-4 inline-flex">
                    Add client
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}

        {/* STATUS & FLOW TAB */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Assessment Verdict Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {verdicts ? (
                  VERDICT_FLOW_ORDER.map((key) => {
                    const count = verdicts[key];
                    if (typeof count !== 'number') return null;
                    const formatKey = key.replace(/_/g, ' ');
                    return (
                      <div key={key} className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                        <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-200">{count}</div>
                        <div className="text-xs font-medium text-zinc-500 mt-2 uppercase">{formatKey}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-8 text-zinc-500 dark:text-zinc-400">
                    No verdict data available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CANDIDATE PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <DashboardPerformanceTab data={candidateAnalytics} />
        )}

        {/* MODES TAB */}
        {activeTab === 'modes' && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Interview Mode Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {modeAnalytics && Object.entries(modeAnalytics.modeDistribution).map(([mode, count]) => (
                <Link href={`/admin/review?mode=${mode}`} key={mode} className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border border-zinc-100 dark:border-zinc-800 cursor-pointer block">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{count}</div>
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-2 uppercase tracking-wide">{mode}</div>
                </Link>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Recorded Interviews: {modeAnalytics?.totalInterviews || 0}
            </div>
          </div>
        )}

        {/* TRENDS TAB */}
        {activeTab === 'trends' && (
          <DashboardTrendsTab trends={trends} />
        )}

        {/* TOKENS TAB */}
        {activeTab === 'tokens' && (
          <div className="card p-6 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Daily Token Usage</h3>
              <Link href="/admin/settings/tokens" className="text-sm text-blue-600 hover:underline">Manage Settings</Link>
            </div>
            
            {tokenData ? (
              <div className="space-y-6">
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${tokenData.overLimit ? 'bg-red-500' : tokenData.nearLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (tokenData.usage / tokenData.limit) * 100)}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="text-sm text-zinc-500 mb-1">Tokens Used Today</div>
                    <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{tokenData.usage.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="text-sm text-zinc-500 mb-1">Tokens Remaining</div>
                    <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{tokenData.remainingTokens.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800 col-span-2">
                    <div className="text-sm text-zinc-500 mb-1">Daily Limit (Hard Cap)</div>
                    <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{tokenData.limit.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500">Token data unavailable</div>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
}
