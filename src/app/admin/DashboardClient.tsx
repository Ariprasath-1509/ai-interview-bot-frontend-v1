'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SkeletonDashboard } from '@/components/common/Skeleton';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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

interface CandidateAnalytics {
  performanceByVerdict: Record<string, number>;
  performanceByMode: Record<string, { totalCandidates: number; readyCandidates: number; successRate: number; }>;
  topCandidates: Array<{ candidateName: string; candidateEmail: string; averageScore: number; verdict: string; interviewMode: string; jdTitle: string; }>;
  commonWeaknesses: Array<{ skill: string; candidateCount: number; percentage: number; }>;
  averageScoresBySkill: Record<string, number>;
  totalAssessedCandidates: number;
  overallSuccessRate: number;
  hasData: boolean;
}

interface ClientAnalytics {
  totalClients: number;
  totalMatchingCandidates: number;
  clientsWithMatches: number;
  averageMatchesPerClient: number;
}

interface Interviewer {
  name: string; interviewCount: number; successRate: number;
}

interface TrendData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

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
        setVerdicts(extracted.verdicts || extracted.data || extracted);
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center">
        {/* Token Usage Alert Summary */}
        <div>
          {tokenData && (tokenData.nearLimit || tokenData.overLimit) && (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${tokenData.overLimit ? 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900/50' : 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-900/50'}`}>
              {tokenData.overLimit ? '🚫 Token Limit Exceeded' : '⚠️ Approaching Token Limit'} ({tokenData.usage.toLocaleString()} / {tokenData.limit.toLocaleString()})
            </div>
          )}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: {analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/50'
            }`}
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
              <div className="mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Interview Pipeline</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Current status of all interviews in the system</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatusCard title="Draft" description="Created but not yet scheduled" count={analytics?.statusCounts.scheduled || 0} color="indigo" icon="📝" linkTo="/admin/review?status=DRAFT" />
                <StatusCard title="Scheduled" description="Booked but not yet started" count={analytics?.statusCounts.scheduled || 0} color="blue" icon="📅" linkTo="/admin/review?status=SCHEDULED" />
                <StatusCard title="Review Pending" description="Awaiting manager sign-off" count={reviewPendingCount} color="yellow" icon="⏳" linkTo="/admin/review?status=REVIEW_PENDING" />
                <StatusCard title="Completed" description="Fully assessed by AI" count={analytics?.statusCounts.completed || 0} color="green" icon="✅" linkTo="/admin/review?status=COMPLETED" />
                <StatusCard title="Signed Off" description="Final verdict submitted" count={analytics?.statusCounts.signedOff || 0} color="purple" icon="✍️" linkTo="/admin/review?status=SIGNED_OFF" />
              </div>
            </div>

            {/* Activity & Outcomes */}
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Activity & Outcomes</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Interview volume, client positions, and readiness results</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatusCard title="Interviews Today" description="Created or updated today" count={analytics?.timePeriods.today || 0} color="indigo" icon="📊" />
                <StatusCard title="Interviews This Week" description="Created or updated this week" count={analytics?.timePeriods.thisWeek || 0} color="teal" icon="📈" />
                <StatusCard title="Total Clients" description="Active client positions" count={clientAnalytics?.totalClients || 0} color="blue" icon="🏢" linkTo="/admin/clients" />
                <StatusCard title="Matching Candidates" description="Candidates matched to client positions" count={clientAnalytics?.totalMatchingCandidates || 0} color="purple" icon="🎯" subtitle={`${clientAnalytics?.averageMatchesPerClient || 0} avg per client`} linkTo="/admin/matching" />
                <StatusCard title="Bench Readiness Rate" description="Candidates marked Ready out of all assessed" count={`${analytics?.successMetrics.successRate || 0}%`} color="emerald" icon="✅" subtitle={`${analytics?.successMetrics.readyCount || 0} ready / ${analytics?.successMetrics.totalAssessed || 0} assessed`} />
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
                {verdicts && Object.keys(verdicts).length > 0 ? (
                  Object.entries(verdicts).map(([key, count]) => {
                    if (typeof count === 'object' && count !== null) return null; // Prevent React object render error
                    const formatKey = key.replace(/_/g, ' ');
                    return (
                      <div key={key} className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                        <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-200">{String(count)}</div>
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
          <div className="space-y-6">
            {candidateAnalytics?.hasData ? (
              <>
                {/* Top Candidates */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Top Performing Candidates</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 font-medium rounded-l-lg">Candidate</th>
                          <th className="px-4 py-3 font-medium">Mode</th>
                          <th className="px-4 py-3 font-medium">Avg Score</th>
                          <th className="px-4 py-3 font-medium">Verdict</th>
                          <th className="px-4 py-3 font-medium rounded-r-lg">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {candidateAnalytics.topCandidates.map((candidate, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.candidateName}</div>
                                <div className="text-xs text-zinc-500">{candidate.candidateEmail}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                {candidate.interviewMode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(candidate.averageScore / 5) * 100}%` }}></div>
                                </div>
                                <span className="font-mono text-sm">{candidate.averageScore}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                candidate.verdict === 'READY' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                candidate.verdict === 'NEEDS_1_WEEK_PREP' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {candidate.verdict.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs">{candidate.jdTitle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Performance by Mode */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Success Rate by Interview Mode</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(candidateAnalytics.performanceByMode).map(([mode, stats]) => (
                      <div key={mode} className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">{mode}</div>
                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{stats.successRate}%</div>
                        <div className="text-xs text-zinc-500">{stats.readyCandidates}/{stats.totalCandidates} ready</div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 mt-2">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${stats.successRate}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skill Gaps */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Common Skill Gaps</h3>
                    <div className="space-y-3">
                      {candidateAnalytics.commonWeaknesses.map((weakness, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{weakness.skill}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{weakness.candidateCount} candidates</div>
                            <div className="text-xs text-zinc-500">{weakness.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Average Scores by Skill</h3>
                    <div className="space-y-3">
                      {Object.entries(candidateAnalytics.averageScoresBySkill).map(([skill, score]) => (
                        <div key={skill} className="flex items-center justify-between">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{skill}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                              <div className={`h-2 rounded-full ${
                                score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} style={{ width: `${(score / 5) * 100}%` }}></div>
                            </div>
                            <span className="font-mono text-sm w-8">{score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="card p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{candidateAnalytics.totalAssessedCandidates}</div>
                      <div className="text-sm text-zinc-500 mt-1">Total Assessed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{candidateAnalytics.overallSuccessRate}%</div>
                      <div className="text-sm text-zinc-500 mt-1">Overall Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{candidateAnalytics.performanceByVerdict.READY || 0}</div>
                      <div className="text-sm text-zinc-500 mt-1">Ready Candidates</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="card p-12 text-center">
                <div className="text-zinc-400 text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No Candidate Data Available</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Complete some interviews to see candidate performance analytics.</p>
              </div>
            )}
          </div>
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
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Weekly Trends</h3>
            {trends?.labels && trends.labels.length > 0 ? (
              <div className="h-64 flex items-end gap-2 justify-between">
                {/* Simple CSS Bar Chart Visualization */}
                {trends.labels.map((label, idx) => {
                  const scheduled = trends.datasets[0].data[idx] || 0;
                  const completed = trends.datasets[1].data[idx] || 0;
                  const max = Math.max(...trends.datasets[0].data, ...trends.datasets[1].data) || 1;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div className="flex gap-1 items-end w-full justify-center h-48 mb-2">
                        <div 
                          className="w-1/3 bg-blue-300 dark:bg-blue-600 rounded-t-sm" 
                          style={{ height: `${(scheduled / max) * 100}%` }}
                          title={`Scheduled: ${scheduled}`}
                        ></div>
                        <div 
                          className="w-1/3 bg-emerald-400 dark:bg-emerald-600 rounded-t-sm" 
                          style={{ height: `${(completed / max) * 100}%` }}
                          title={`Completed: ${completed}`}
                        ></div>
                      </div>
                      <div className="text-xs text-zinc-500 font-medium">{label}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                No trend data available
              </div>
            )}
            <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-300 dark:bg-blue-600 rounded-sm"></div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-400 dark:bg-emerald-600 rounded-sm"></div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Completed</span>
              </div>
            </div>
          </div>
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

function StatusCard({ title, description, count, color, icon, subtitle, linkTo }: {
  title: string;
  description?: string;
  count: number | string;
  color: string;
  icon: string;
  subtitle?: string;
  linkTo?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-100',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-100',
    green: 'bg-green-50 border-green-200 text-green-900 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-100',
    purple: 'bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-900/20 dark:border-purple-900/30 dark:text-purple-100',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-900/20 dark:border-indigo-900/30 dark:text-indigo-100',
    teal: 'bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-900/20 dark:border-teal-900/30 dark:text-teal-100',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-100'
  };

  const content = (
    <div className={`h-full p-5 rounded-xl border shadow-sm transition-all duration-200 ${colorClasses[color as keyof typeof colorClasses]} ${linkTo ? 'hover:scale-[1.02] hover:shadow-md cursor-pointer' : ''}`}>
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug">{title}</p>
            <span className="text-xl opacity-70 shrink-0">{icon}</span>
          </div>
          {description && <p className="text-xs opacity-55 mt-1 leading-snug">{description}</p>}
        </div>
        <div className="mt-3">
          <p className="text-3xl font-bold tabular-nums">{count}</p>
          {subtitle && <p className="text-xs mt-1 opacity-65">{subtitle}</p>}
          {linkTo && <p className="text-xs mt-2 opacity-55 font-medium">View →</p>}
        </div>
      </div>
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo} className="block h-full">{content}</Link>;
  }
  return content;
}
