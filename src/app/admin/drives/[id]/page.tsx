'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Drive {
  id: string;
  title: string;
  description: string;
  batchName: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  totalPositions: number;
}

interface Candidate {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  registrationDate: string;
  currentRound: number;
  round1Status: string;
  round1Score: number;
  round2Status: string;
  round2Score: number;
  round3Status: string;
  finalStatus: string;
}

interface Analytics {
  totalCandidates: number;
  round1: { notStarted: number; inProgress: number; passed: number; failed: number; passRate: number };
  round2: { notStarted: number; inProgress: number; passed: number; failed: number; passRate: number };
  round3: { notStarted: number; inProgress: number; passed: number; failed: number };
  finalStatus: { selected: number; rejected: number; pending: number; withdrawn: number };
  funnel: { registered: number; round1Completed: number; round2Completed: number; round3Completed: number; selected: number };
  averageScores: { round1: number; round2: number };
}

export default function DriveDetailsPage() {
  const params = useParams();
  const driveId = params.id as string;

  const [drive, setDrive] = useState<Drive | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);

  const fetchDriveData = useCallback(async () => {
    try {
      const [driveRes, candidatesRes, analyticsRes] = await Promise.all([
        fetch(`/api/drives/${driveId}`),
        fetch(`/api/drives/${driveId}/candidates`),
        fetch(`/api/drives/${driveId}/analytics`)
      ]);

      if (driveRes.ok) setDrive(await driveRes.json());
      if (candidatesRes.ok) setCandidates(await candidatesRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (error) {
      console.error('Failed to fetch drive data:', error);
    } finally {
      setLoading(false);
    }
  }, [driveId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchDriveData();
    }, 0);
    return () => window.clearTimeout(t);
  }, [fetchDriveData]);

  const updateDriveStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/drives/${driveId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchDriveData();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      DRAFT: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      CLOSED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      NOT_STARTED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
      IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      PASSED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      SELECTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      WITHDRAWN: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
    };
    return colors[status as keyof typeof colors] || colors.PENDING;
  };

  if (loading || !drive) {
    return <div className="p-6">Loading drive details...</div>;
  }

  const registrationLink = `${window.location.origin}/drive/register/${driveId}`;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link href="/admin/drives" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-2 inline-block">
            ← Back to Drives
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{drive.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{drive.description}</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(drive.status)}`}>
            {drive.status}
          </span>
          {drive.status === 'DRAFT' && (
            <button
              onClick={() => updateDriveStatus('ACTIVE')}
              className="px-4 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
            >
              Activate
            </button>
          )}
          {drive.status === 'ACTIVE' && (
            <button
              onClick={() => updateDriveStatus('CLOSED')}
              className="px-4 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Drive Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Batch</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {drive.batchName || '-'}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Start Date</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {new Date(drive.startDate).toLocaleDateString()}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">End Date</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {new Date(drive.endDate).toLocaleDateString()}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Positions</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {drive.totalPositions || '-'}
          </div>
        </div>
      </div>

      {/* Registration Link */}
      {drive.status === 'ACTIVE' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Registration Link (Share with candidates):</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={registrationLink}
              readOnly
              className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-blue-300 dark:border-blue-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={() => navigator.clipboard.writeText(registrationLink)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
        {(['overview', 'candidates', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{analytics.totalCandidates}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Registered</div>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.round1.passed}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Round 1 Passed</div>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.round2.passed}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Round 2 Passed</div>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analytics.round3.passed}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Round 3 Passed</div>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.finalStatus.selected}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Selected</div>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Candidate Funnel</h3>
            <div className="space-y-3">
              {[
                { label: 'Registered', value: analytics.funnel.registered, color: 'bg-blue-500' },
                { label: 'Round 1 Completed', value: analytics.funnel.round1Completed, color: 'bg-purple-500' },
                { label: 'Round 2 Completed', value: analytics.funnel.round2Completed, color: 'bg-orange-500' },
                { label: 'Round 3 Completed', value: analytics.funnel.round3Completed, color: 'bg-pink-500' },
                { label: 'Selected', value: analytics.funnel.selected, color: 'bg-green-500' }
              ].map((stage) => (
                <div key={stage.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300">{stage.label}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{stage.value}</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className={`${stage.color} h-2 rounded-full transition-all`}
                      style={{ width: `${(stage.value / analytics.funnel.registered) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Candidate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Round 1</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Round 2</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Round 3</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.candidateName}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{candidate.candidateEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(candidate.round1Status)}`}>
                        {candidate.round1Status}
                      </span>
                      {candidate.round1Score && <div className="text-xs text-zinc-500 mt-1">{candidate.round1Score}%</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(candidate.round2Status)}`}>
                        {candidate.round2Status}
                      </span>
                      {candidate.round2Score && <div className="text-xs text-zinc-500 mt-1">{candidate.round2Score}%</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(candidate.round3Status)}`}>
                        {candidate.round3Status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(candidate.finalStatus)}`}>
                        {candidate.finalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Round 1 Stats */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Round 1 Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Pass Rate</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{analytics.round1.passRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Average Score</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{analytics.averageScores.round1.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600 dark:text-green-400">Passed</span>
                <span className="font-bold">{analytics.round1.passed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600 dark:text-red-400">Failed</span>
                <span className="font-bold">{analytics.round1.failed}</span>
              </div>
            </div>
          </div>

          {/* Round 2 Stats */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Round 2 Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Pass Rate</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{analytics.round2.passRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Average Score</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{analytics.averageScores.round2.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600 dark:text-green-400">Passed</span>
                <span className="font-bold">{analytics.round2.passed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600 dark:text-red-400">Failed</span>
                <span className="font-bold">{analytics.round2.failed}</span>
              </div>
            </div>
          </div>

          {/* Final Status Distribution */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 md:col-span-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Final Status Distribution</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.finalStatus.selected}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Selected</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{analytics.finalStatus.rejected}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Rejected</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.finalStatus.pending}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Pending</div>
              </div>
              <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-900/20 rounded-lg">
                <div className="text-3xl font-bold text-zinc-600 dark:text-zinc-400">{analytics.finalStatus.withdrawn}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Withdrawn</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
