'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface InterviewSummary {
  id: string;
  status: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
  candidateName: string;
  candidateEmail: string;
  jdTitle: string;
  createdAt: string;
  interviewMode: string;
}

export default function InterviewReviewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Read initial filters from URL params for reactivity with dashboard cards
  const [filter, setFilter] = useState({
    status: searchParams?.get('status') || '',
    mode: searchParams?.get('mode') || '',
    verdict: searchParams?.get('verdict') || ''
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.mode) params.set('mode', filter.mode);
    if (filter.verdict) params.set('verdict', filter.verdict);
    
    // Only replace if params actually changed to avoid loop
    const currentParams = searchParams ? searchParams.toString() : '';
    const newParams = params.toString();
    if (currentParams !== newParams) {
      router.replace(`?${newParams}`, { scroll: false });
    }
  }, [filter, router, searchParams]);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await fetch('/api/interviews/summary');
      const data = await response.json();
      setInterviews(data);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (interviewId: string) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the interviews list
        fetchInterviews();
        alert('Interview deleted successfully');
      } else {
        const error = await response.text();
        alert(`Failed to delete interview: ${error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting interview');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-green-200 dark:border-emerald-800/50',
      SIGNED_OFF: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
    };
    return colors[status as keyof typeof colors] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
  };

  const getModeBadge = (mode: string) => {
    const colors = {
      SCREENING: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      L1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
      L2: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
      L3: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
      L4: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50'
    };
    return colors[mode as keyof typeof colors] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
  };

  const getVerdictBadge = (verdict: string | null) => {
    if (!verdict) return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    
    const colors = {
      READY: 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-green-200 dark:border-emerald-800/50',
      NEEDS_1_WEEK_PREP: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50',
      NEEDS_RESKILLING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
      MISMATCH_WITH_JD: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50',
      WITHDRAWN: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
    };
    return colors[verdict as keyof typeof colors] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
  };

  const filteredInterviews = interviews.filter(interview => {
    return (
      (!filter.status || interview.status === filter.status) &&
      (!filter.mode || interview.interviewMode === filter.mode) &&
      (!filter.verdict || interview.finalVerdict === filter.verdict)
    );
  });

  if (loading) {
    return <div className="p-6">Loading interviews...</div>;
  }

  const inputCls = "w-full p-2 border rounded-lg bg-white dark:bg-zinc-950 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={fetchInterviews}
          className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className={inputCls}
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="SIGNED_OFF">Signed Off</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Mode</label>
            <select
              value={filter.mode}
              onChange={(e) => setFilter(prev => ({ ...prev, mode: e.target.value }))}
              className={inputCls}
            >
              <option value="">All Modes</option>
              <option value="SCREENING">Screening</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Verdict</label>
            <select
              value={filter.verdict}
              onChange={(e) => setFilter(prev => ({ ...prev, verdict: e.target.value }))}
              className={inputCls}
            >
              <option value="">All Verdicts</option>
              <option value="READY">Ready</option>
              <option value="NEEDS_1_WEEK_PREP">Needs 1 Week Prep</option>
              <option value="NEEDS_RESKILLING">Needs Reskilling</option>
              <option value="MISMATCH_WITH_JD">Mismatch with JD</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interview Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Candidate</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Mode</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Verdict</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Created</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredInterviews.length > 0 ? filteredInterviews.map((interview) => (
              <tr key={interview.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{interview.candidateName}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{interview.candidateEmail}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate" title={interview.jdTitle}>{interview.jdTitle}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded border ${getModeBadge(interview.interviewMode)}`}>
                    {interview.interviewMode}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(interview.status)}`}>
                    {interview.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {interview.finalVerdict ? (
                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getVerdictBadge(interview.finalVerdict)}`}>
                      {interview.finalVerdict.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs italic">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {new Date(interview.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <Link 
                      href={`/admin/interviews/${interview.id}/review`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium underline underline-offset-2"
                    >
                      Review
                    </Link>
                    <button
                      onClick={() => handleDelete(interview.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium underline underline-offset-2"
                      title="Delete interview"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No interviews found matching the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
