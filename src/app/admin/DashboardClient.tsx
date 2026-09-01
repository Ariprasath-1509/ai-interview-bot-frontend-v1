'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Activity,
  UserCheck,
  Layers,
  TrendingUp,
  Zap,
  Clock,
  AlertTriangle,
  ExternalLink,
  Calendar,
  PlayCircle,
  CheckCircle2,
  Award,
  Sparkles,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/common/AppUi';
import DashboardTrendsTab, { type TrendsResponse } from '@/app/admin/DashboardTrendsTab';
import DashboardPerformanceTab, { type CandidatePerformanceData } from '@/app/admin/DashboardPerformanceTab';

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

const VERDICT_CONFIG: Record<string, { label: string; accent: "purple" | "rose" | "amber" | "yellow" | "emerald"; icon: any }> = {
  WITHDRAWN: { label: 'Withdrawn / Ended Early', accent: 'purple', icon: Clock },
  MISMATCH_WITH_JD: { label: 'Mismatch with JD', accent: 'rose', icon: AlertTriangle },
  NEEDS_RESKILLING: { label: 'Needs Reskilling', accent: 'amber', icon: TrendingUp },
  NEEDS_1_WEEK_PREP: { label: 'Needs 1-Week Prep', accent: 'yellow', icon: Activity },
  READY: { label: 'Ready for Deployment', accent: 'emerald', icon: Sparkles },
};

type CandidateAnalytics = CandidatePerformanceData
type TrendData = TrendsResponse

// In-memory module cache for instant (0ms) tab switching back to Dashboard
let dashboardCache: {
  analytics: AnalyticsData | null;
  tokenData: TokenData | null;
  modeAnalytics: ModeAnalytics | null;
  verdicts: VerdictAnalytics | null;
  candidateAnalytics: CandidateAnalytics | null;
  trends: TrendData | null;
  reviewPendingCount: number;
} | null = null;

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState('overview');

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(dashboardCache?.analytics ?? null);
  const [tokenData, setTokenData] = useState<TokenData | null>(dashboardCache?.tokenData ?? null);
  const [modeAnalytics, setModeAnalytics] = useState<ModeAnalytics | null>(dashboardCache?.modeAnalytics ?? null);
  const [verdicts, setVerdicts] = useState<VerdictAnalytics | null>(dashboardCache?.verdicts ?? null);
  const [candidateAnalytics, setCandidateAnalytics] = useState<CandidateAnalytics | null>(dashboardCache?.candidateAnalytics ?? null);
  const [trends, setTrends] = useState<TrendData | null>(dashboardCache?.trends ?? null);
  const [reviewPendingCount, setReviewPendingCount] = useState(dashboardCache?.reviewPendingCount ?? 0);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      // Fast Phase: Fetch core overview metrics first (~40ms) to clear loading spinner quickly
      const [
        analyticsData,
        tokenResData,
        modeResData,
        verdictsRawData,
      ] = await Promise.all([
        fetch('/api/analytics/realtime').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/tokens/check-limit').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/analytics/modes').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/analytics/verdicts').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (analyticsData) setAnalytics(analyticsData);
      if (tokenResData) setTokenData(tokenResData);
      if (modeResData) setModeAnalytics(modeResData);

      let extractedVerdicts = verdictsRawData;
      if (verdictsRawData && typeof verdictsRawData === 'object' && !verdictsRawData.READY && Object.values(verdictsRawData).some(v => typeof v === 'object' && v !== null && 'READY' in v)) {
        extractedVerdicts = Object.values(verdictsRawData).find(v => typeof v === 'object' && v !== null && 'READY' in v);
      }
      const parsedVerdicts = extractedVerdicts ? (
        extractedVerdicts.verdictDistribution ||
        extractedVerdicts.verdicts ||
        extractedVerdicts.data ||
        extractedVerdicts
      ) : null;
      if (parsedVerdicts) setVerdicts(parsedVerdicts);

      // Dismiss loading spinner fast as soon as primary overview metrics arrive
      setLoading(false);

      // Secondary Phase: Fetch heavier background aggregate queries concurrently
      const [
        candidatesData,
        trendsData,
        summaryData
      ] = await Promise.all([
        fetch('/api/analytics/candidates').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/analytics/trends').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/interviews/summary').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (candidatesData) setCandidateAnalytics(candidatesData);
      if (trendsData) setTrends(trendsData);

      let pendingCount = 0;
      if (Array.isArray(summaryData)) {
        pendingCount = summaryData.filter(i => i.status === 'REVIEW_PENDING').length;
        setReviewPendingCount(pendingCount);
      }

      // Update module cache for smooth fallback
      dashboardCache = {
        analytics: analyticsData ?? dashboardCache?.analytics ?? null,
        tokenData: tokenResData ?? dashboardCache?.tokenData ?? null,
        modeAnalytics: modeResData ?? dashboardCache?.modeAnalytics ?? null,
        verdicts: parsedVerdicts ?? dashboardCache?.verdicts ?? null,
        candidateAnalytics: candidatesData ?? dashboardCache?.candidateAnalytics ?? null,
        trends: trendsData ?? dashboardCache?.trends ?? null,
        reviewPendingCount: pendingCount || dashboardCache?.reviewPendingCount || 0,
      };
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner message="Loading interview dashboard..." />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'status', label: 'Status & Flow', icon: Activity },
    { id: 'performance', label: 'Candidate Performance', icon: UserCheck },
    { id: 'modes', label: 'Interview Modes', icon: Layers },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'tokens', label: 'Token Usage', icon: Zap },
  ] as const;

  return (
    <div className="space-y-6 w-full animate-in">
      {/* Top Banner Card with Gradient & Logo */}
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] p-6 text-white shadow-lg border border-purple-400/30">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white font-black text-base shadow-lg shadow-purple-950/50 border border-white/25">
              BR
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="text-white">Bench Readiness Analytics</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/20">
                  Live
                </span>
              </h2>
              <p className="text-xs text-white/90 mt-1 font-normal">
                Real-time tracking of candidate pipeline, evaluation verdicts, and AI readiness scores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-white self-start md:self-auto">
            <Clock className="h-4 w-4 text-purple-200" />
            <span>Last Updated: {analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleTimeString() : 'Just now'}</span>
          </div>
        </div>
      </div>

      {/* Token Alert Banner */}
      {tokenData && (tokenData.nearLimit || tokenData.overLimit) && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-4 border transition-all ${
          tokenData.overLimit 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {tokenData.overLimit ? 'Token Hard Limit Exceeded' : 'Approaching Token Usage Threshold'}
              </p>
              <p className="text-xs opacity-90">
                {tokenData.usage.toLocaleString()} / {tokenData.limit.toLocaleString()} tokens utilized today.
              </p>
            </div>
          </div>
          <Link
            href="/admin/settings/tokens"
            className="text-xs font-semibold underline hover:opacity-80 shrink-0"
          >
            Manage Limits →
          </Link>
        </div>
      )}

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.98] focus:outline-none border ${
                isActive
                  ? 'bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] !text-white hover:!text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_10px_rgba(42,0,53,0.4)] border-purple-300/30'
                  : 'border-transparent text-[var(--text-secondary)] hover:!text-white hover:bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_10px_rgba(42,0,53,0.4)] hover:border-purple-300/30'
              }`}
            >
              <Icon className="h-4 w-4 text-current" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      <div className="space-y-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Interview Pipeline */}
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-semibold">Interview Pipeline</CardTitle>
                <CardDescription>Real-time status of all candidate interviews</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard
                    title="Scheduled"
                    description="Booked & upcoming"
                    value={analytics?.statusCounts.scheduled ?? 0}
                    accent="teal"
                    icon={Calendar}
                    linkTo="/admin/review?status=SCHEDULED"
                  />
                  <StatCard
                    title="In Progress"
                    description="Currently active"
                    value={analytics?.statusCounts.inProgress || 0}
                    accent="blue"
                    icon={PlayCircle}
                    linkTo="/admin/review?status=IN_PROGRESS"
                  />
                  <StatCard
                    title="Review Pending"
                    description="Awaiting evaluation"
                    value={reviewPendingCount}
                    accent="yellow"
                    icon={Clock}
                    linkTo="/admin/review?status=REVIEW_PENDING"
                  />
                  <StatCard
                    title="Completed"
                    description="Fully AI assessed"
                    value={analytics?.statusCounts.completed || 0}
                    accent="green"
                    icon={CheckCircle2}
                    linkTo="/admin/review?status=COMPLETED"
                  />
                  <StatCard
                    title="Signed Off"
                    description="Final verdict submitted"
                    value={analytics?.statusCounts.signedOff || 0}
                    accent="purple"
                    icon={Award}
                    linkTo="/admin/review?status=SIGNED_OFF"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Activity & Outcomes */}
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-semibold">Activity & Bench Readiness</CardTitle>
                <CardDescription>Interview throughput and candidate readiness rates</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Interviews Today"
                    description="Recorded during last 24 hours"
                    value={analytics?.timePeriods.today || 0}
                    accent="indigo"
                    icon={Activity}
                  />
                  <StatCard
                    title="Interviews This Week"
                    description="Recorded during past 7 days"
                    value={analytics?.timePeriods.thisWeek || 0}
                    accent="teal"
                    icon={TrendingUp}
                  />
                  <StatCard
                    title="Bench Readiness Rate"
                    description="Candidates assessed as deployment ready"
                    value={`${analytics?.successMetrics.successRate || 0}%`}
                    accent="emerald"
                    icon={Sparkles}
                    subtitle={`${analytics?.successMetrics.readyCount || 0} ready / ${analytics?.successMetrics.totalAssessed || 0} assessed`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {/* STATUS & FLOW TAB */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-semibold">Assessment Verdict Distribution</CardTitle>
                <CardDescription>Breakdown of AI and manager final readiness verdicts</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {verdicts ? (
                    VERDICT_FLOW_ORDER.map((key) => {
                      const count = verdicts[key];
                      if (typeof count !== 'number') return null;
                      const config = VERDICT_CONFIG[key] || VERDICT_CONFIG.WITHDRAWN;
                      return (
                        <StatCard
                          key={key}
                          title={config.label}
                          value={count}
                          accent={config.accent}
                          icon={config.icon}
                          linkTo={`/admin/review?verdict=${key}`}
                        />
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                      No verdict distribution data available.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CANDIDATE PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <DashboardPerformanceTab data={candidateAnalytics} />
        )}

        {/* INTERVIEW MODES TAB */}
        {activeTab === 'modes' && (
          <Card className="p-6">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Interview Mode Distribution</CardTitle>
                <CardDescription>Total interviews conducted across screening and technical rounds</CardDescription>
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-3 py-1 rounded-full border border-[var(--border)]">
                Total Recorded: {modeAnalytics?.totalInterviews || 0}
              </span>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {modeAnalytics && Object.entries(modeAnalytics.modeDistribution).map(([mode, count]) => (
                  <StatCard
                    key={mode}
                    title={mode}
                    value={count}
                    accent="blue"
                    icon={Layers}
                    linkTo={`/admin/review?mode=${mode}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TRENDS TAB */}
        {activeTab === 'trends' && (
          <DashboardTrendsTab trends={trends} />
        )}

        {/* TOKEN USAGE TAB */}
        {activeTab === 'tokens' && (
          <Card className="p-6 max-w-3xl">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Daily Token Consumption</CardTitle>
                <CardDescription>Live monitoring of LLM token quota usage</CardDescription>
              </div>
              <Link
                href="/admin/settings/tokens"
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>Manage Quotas</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </CardHeader>

            <CardContent className="px-0 pb-0 space-y-6">
              {tokenData ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)]">
                      <span>Usage Progress</span>
                      <span>{Math.round(Math.min(100, (tokenData.usage / tokenData.limit) * 100))}%</span>
                    </div>
                    <div className="w-full bg-[var(--surface-subtle)] rounded-full h-3 overflow-hidden border border-[var(--border)] p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          tokenData.overLimit ? 'bg-rose-500' : tokenData.nearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (tokenData.usage / tokenData.limit) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
                      <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Tokens Used Today</div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                        {tokenData.usage.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
                      <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Tokens Remaining</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {tokenData.remainingTokens.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
                      <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Hard Quota Cap</div>
                      <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                        {tokenData.limit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  Token consumption data is currently unavailable.
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}