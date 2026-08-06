'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { SkeletonDashboard } from '@/components/common/Skeleton';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHero, SectionHeader, StatCard } from '@/components/common/AppUi';
import DashboardTrendsTab, { type TrendsResponse } from '@/app/admin/DashboardTrendsTab';
import DashboardPerformanceTab, { type CandidatePerformanceData } from '@/app/admin/DashboardPerformanceTab';
import TokenAnalyticsTab, { type TodayTokenData as TokenData, type PeriodTokenData as WeeklyTokenData, type PerInterviewTokenData } from '@/app/admin/TokenAnalyticsTab';

// Interfaces
interface AnalyticsData {
  statusCounts: {
    draft: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    signedOff: number;
    withdrawn: number;
    reviewPending: number;
    total: number;
  };
  timePeriods: { today: number; thisWeek: number; total: number; };
  successMetrics: { readyCount: number; totalAssessed: number; successRate: number; };
  lastUpdated: string;
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

type CandidateAnalytics = CandidatePerformanceData

interface Interviewer {
  name: string; interviewCount: number; successRate: number;
}

type TrendData = TrendsResponse

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState('overview');

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [weeklyTokens, setWeeklyTokens] = useState<WeeklyTokenData | null>(null);
  const [monthlyTokens, setMonthlyTokens] = useState<WeeklyTokenData | null>(null);
  const [perInterviewTokens, setPerInterviewTokens] = useState<PerInterviewTokenData | null>(null);
  const [modeAnalytics, setModeAnalytics] = useState<ModeAnalytics | null>(null);
  const [verdicts, setVerdicts] = useState<VerdictAnalytics | null>(null);
  const [candidateAnalytics, setCandidateAnalytics] = useState<CandidateAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [reviewPendingCount, setReviewPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, tokenRes, modeRes, verdictsRes, candidatesRes, trendsRes, reviewRes,
             weeklyTokenRes, monthlyTokenRes, perInterviewTokenRes] = await Promise.all([
        fetch('/api/analytics/realtime').catch(() => null),
        fetch('/api/tokens/check-limit').catch(() => null),
        fetch('/api/analytics/modes').catch(() => null),
        fetch('/api/analytics/verdicts').catch(() => null),
        fetch('/api/analytics/candidates').catch(() => null),
        fetch('/api/analytics/trends').catch(() => null),
        fetch('/api/interviews/summary').catch(() => null),
        fetch('/api/tokens/analytics/weekly').catch(() => null),
        fetch('/api/tokens/analytics/monthly').catch(() => null),
        fetch('/api/tokens/analytics/per-interview').catch(() => null),
      ]);

      if (analyticsRes?.ok) setAnalytics(await analyticsRes.json());
      if (tokenRes?.ok) setTokenData(await tokenRes.json());
      if (weeklyTokenRes?.ok) setWeeklyTokens(await weeklyTokenRes.json());
      if (monthlyTokenRes?.ok) setMonthlyTokens(await monthlyTokenRes.json());
      if (perInterviewTokenRes?.ok) setPerInterviewTokens(await perInterviewTokenRes.json());
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
    { id: 'overview', label: 'Overview', accent: 'blue' },
    { id: 'status', label: 'Status & Flow', accent: 'purple' },
    { id: 'performance', label: 'Candidate Performance', accent: 'emerald' },
    { id: 'modes', label: 'Interview Modes', accent: 'amber' },
    { id: 'trends', label: 'Trends', accent: 'rose' },
    { id: 'tokens', label: 'Token Usage', accent: 'teal' },
  ] as const;

  return (
      <div className="space-y-6 w-full animate-in">
        <PageHero
            icon={LayoutDashboard}
            title="Admin Dashboard"
            description="Monitor interview pipeline, candidate readiness, and token usage in real time."
            variant="sunset"
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
                  data-accent={tab.accent}
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
                    <StatCard
                        title="Scheduled"
                        description="Booked but not yet started"
                        value={analytics?.statusCounts.scheduled ?? 0}
                        accent="teal"
                        linkTo="/admin/review?status=SCHEDULED"
                    />
                    <StatCard
                        title="In Progress"
                        description="Interview currently underway"
                        value={analytics?.statusCounts.inProgress || 0}
                        accent="blue"
                        linkTo="/admin/review?status=IN_PROGRESS"
                    />
                    <StatCard title="Review Pending" description="Awaiting manager sign-off" value={reviewPendingCount} accent="yellow" linkTo="/admin/review?status=REVIEW_PENDING" />
                    <StatCard title="Completed" description="Fully assessed by AI" value={analytics?.statusCounts.completed || 0} accent="green" linkTo="/admin/review?status=COMPLETED" />
                    <StatCard title="Signed Off" description="Final verdict submitted" value={analytics?.statusCounts.signedOff || 0} accent="purple" linkTo="/admin/review?status=SIGNED_OFF" />
                  </div>
                </div>

                {/* Activity & Outcomes */}
                <div>
                  <SectionHeader
                      title="Activity & Outcomes"
                      description="Interview volume and readiness results"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Interviews Today" description="Created or updated today" value={analytics?.timePeriods.today || 0} accent="indigo" />
                    <StatCard title="Interviews This Week" description="Created or updated this week" value={analytics?.timePeriods.thisWeek || 0} accent="teal" />
                    <StatCard title="Bench Readiness Rate" description="Candidates marked Ready out of all assessed" value={`${analytics?.successMetrics.successRate || 0}%`} accent="emerald" subtitle={`${analytics?.successMetrics.readyCount || 0} ready / ${analytics?.successMetrics.totalAssessed || 0} assessed`} />
                  </div>
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
            <TokenAnalyticsTab
              today={tokenData}
              weekly={weeklyTokens}
              monthly={monthlyTokens}
              perInterview={perInterviewTokens}
            />
          )}

        </div>
      </div>
  );
}