'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EnhancedDataTable } from '@/components/common/EnhancedDataTable';
import { useToast } from '@/components/common/Toast';
import { useConfirm } from '@/components/common/ConfirmDialog';

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

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50",
    REVIEW_PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-green-200 dark:border-emerald-800/50",
    SIGNED_OFF: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
  };
  return colors[status] || "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
}

function getModeBadge(mode: string) {
  const colors: Record<string, string> = {
    SCREENING: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    L1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    L2: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50",
    L3: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
    L4: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50",
  };
  return colors[mode] || "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
}

function getVerdictBadge(verdict: string | null) {
  if (!verdict) return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  const colors: Record<string, string> = {
    READY: "bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-green-200 dark:border-emerald-800/50",
    NEEDS_1_WEEK_PREP: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50",
    NEEDS_RESKILLING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/50",
    MISMATCH_WITH_JD: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50",
    WITHDRAWN: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  };
  return colors[verdict] || "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
}

export default function InterviewReviewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();
  const { confirm } = useConfirm();

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

  const fetchInterviews = useCallback(async () => {
    try {
      const response = await fetch('/api/interviews/summary');
      const data = await response.json();
      setInterviews(data);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer so the effect body does not synchronously schedule setState (react-hooks/set-state-in-effect).
    const t = window.setTimeout(() => {
      void fetchInterviews();
    }, 0);
    return () => window.clearTimeout(t);
  }, [fetchInterviews]);

  const handleDelete = useCallback(async (interviewId: string) => {
    const ok = await confirm({
      title: "Delete Interview",
      message: "Are you sure you want to delete this interview? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchInterviews();
        toast('Interview deleted successfully', 'success');
      } else {
        const error = await response.text();
        toast(`Failed to delete interview: ${error}`, 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast('Error deleting interview', 'error');
    }
  }, [confirm, fetchInterviews, toast]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      return (
        (!filter.status || interview.status === filter.status) &&
        (!filter.mode || interview.interviewMode === filter.mode) &&
        (!filter.verdict || interview.finalVerdict === filter.verdict)
      );
    });
  }, [interviews, filter]);

  const interviewColumns = useMemo<ColumnDef<InterviewSummary, unknown>[]>(
    () => [
      {
        id: "candidate",
        header: "Candidate",
        accessorFn: (r) => `${r.candidateName} ${r.candidateEmail}`,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.original.candidateName}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{row.original.candidateEmail}</div>
          </div>
        ),
      },
      {
        accessorKey: "jdTitle",
        header: "Role",
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block" title={row.original.jdTitle}>
            {row.original.jdTitle}
          </span>
        ),
      },
      {
        accessorKey: "interviewMode",
        header: "Mode",
        cell: ({ row }) => (
          <span
            className={`inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded border ${getModeBadge(row.original.interviewMode)}`}
          >
            {row.original.interviewMode}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(row.original.status)}`}
          >
            {row.original.status.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        accessorKey: "finalVerdict",
        header: "Verdict",
        accessorFn: (r) => r.finalVerdict ?? "",
        cell: ({ row }) =>
          row.original.finalVerdict ? (
            <span
              className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getVerdictBadge(row.original.finalVerdict)}`}
            >
              {row.original.finalVerdict.replace(/_/g, " ")}
            </span>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 text-xs italic">Pending</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-zinc-600 dark:text-zinc-400">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex gap-2 justify-end">
            <Link
              href={`/admin/interviews/${row.original.id}/review`}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium underline underline-offset-2"
            >
              Review
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(row.original.id)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium underline underline-offset-2"
              title="Delete interview"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [handleDelete]
  );

  if (loading) return <LoadingSpinner message="Loading interviews..." />;

  const inputCls = "input-base";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={fetchInterviews}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className={inputCls}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW_PENDING">Review Pending</option>
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

      <div className="card p-4">
        <EnhancedDataTable<InterviewSummary>
          tableId="admin-review-interviews"
          data={filteredInterviews}
          columns={interviewColumns}
          getRowId={(r) => r.id}
          emptyMessage="No interviews found matching the current filters."
          pageSize={12}
        />
      </div>
    </div>
  );
}

