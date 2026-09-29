'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSearchParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EnhancedDataTable } from '@/components/common/EnhancedDataTable';
import { DataTableToolbar } from '@/components/common/DataTableToolbar';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/components/common/Toast';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime } from '@/lib/formatDate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Loader2, Trash2, ClipboardList, Clock, CheckCircle2, ShieldCheck, Filter, Layers } from 'lucide-react';

interface InterviewSummary {
  id: string;
  status: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
  candidateName: string;
  candidateEmail: string;
  jdTitle: string;
  createdAt: string;
  endedAt: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
  interviewMode: string;
}

function fmtDate(iso: string | null | undefined): string {
  return formatDate(iso);
}

function fmtDatetime(iso: string | null | undefined): string {
  return formatDateTime(iso, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    SCHEDULED: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    IN_PROGRESS: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    REVIEW_PENDING: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    SIGNED_OFF: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    EXPIRED: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  };
  return colors[status] || "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
}

function getModeBadge(mode: string) {
  const colors: Record<string, string> = {
    SCREENING: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    L1: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    L2: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    L3: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    L4: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  };
  return colors[mode] || "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
}

function getVerdictBadge(verdict: string | null) {
  if (!verdict) return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
  const colors: Record<string, string> = {
    READY: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    NEEDS_1_WEEK_PREP: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    NEEDS_RESKILLING: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    MISMATCH_WITH_JD: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    WITHDRAWN: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  };
  return colors[verdict] || "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
}

export default function InterviewReviewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [filter, setFilter] = useState({
    status: searchParams?.get('status') || '',
    mode: searchParams?.get('mode') || '',
    verdict: searchParams?.get('verdict') || ''
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.mode) params.set('mode', filter.mode);
    if (filter.verdict) params.set('verdict', filter.verdict);

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
    void fetchInterviews();
  }, [fetchInterviews]);

  const handleReview = useCallback(
    (interviewId: string) => {
      setReviewingId(interviewId);
      router.push(`/admin/interviews/${interviewId}/review`);
    },
    [router]
  );

  const handleDelete = useCallback(async (interviewId: string) => {
    const ok = await confirm({
      title: "Delete Interview",
      message: "Are you sure you want to delete this interview? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingId(interviewId);
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
    } finally {
      setDeletingId(null);
    }
  }, [confirm, fetchInterviews, toast]);

  const filteredInterviews = useMemo(() => {
    return interviews
      .filter((interview) => {
        const matchesQuery = !search.trim() ||
          interview.candidateName.toLowerCase().includes(search.toLowerCase()) ||
          interview.candidateEmail.toLowerCase().includes(search.toLowerCase()) ||
          interview.jdTitle.toLowerCase().includes(search.toLowerCase());

        return (
          matchesQuery &&
          (!filter.status || interview.status === filter.status) &&
          (!filter.mode || interview.interviewMode === filter.mode) &&
          (!filter.verdict || interview.finalVerdict === filter.verdict)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [interviews, filter, search]);

  const interviewColumns = useMemo<ColumnDef<InterviewSummary, unknown>[]>(
    () => [
      {
        id: "candidate",
        header: "Candidate",
        meta: { stickyLeft: 0 },
        accessorFn: (r) => `${r.candidateName} ${r.candidateEmail}`,
        cell: ({ row }) => (
          <div className="w-[180px] truncate">
            <div className="font-bold text-[var(--text-primary)] truncate">{row.original.candidateName}</div>
            <div className="text-xs font-medium text-[var(--text-secondary)] truncate">{row.original.candidateEmail}</div>
          </div>
        ),
      },
      {
        accessorKey: "jdTitle",
        header: "Role",
        meta: { stickyLeft: 196, isLastSticky: true },
        cell: ({ row }) => (
          <span className="w-[160px] truncate block font-bold text-[var(--text-primary)]" title={row.original.jdTitle}>
            {row.original.jdTitle}
          </span>
        ),
      },
      {
        accessorKey: "interviewMode",
        header: "Mode",
        cell: ({ row }) => (
          <span
            className={`inline-flex whitespace-nowrap px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full border ${getModeBadge(row.original.interviewMode)}`}
          >
            {row.original.interviewMode}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const { status, scheduledAt, expiresAt } = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full border w-fit ${getStatusBadge(status)}`}
              >
                {status.replace(/_/g, " ")}
              </span>
              {scheduledAt && (
                <span className="text-[10px] font-medium text-[var(--text-secondary)] whitespace-nowrap" title={`Available from: ${fmtDatetime(scheduledAt)}`}>
                  From: {fmtDate(scheduledAt)}
                </span>
              )}
              {expiresAt && (
                <span
                  className={`text-[10px] whitespace-nowrap ${status === 'EXPIRED' ? 'text-rose-600 font-bold' : 'text-[var(--text-secondary)] font-medium'}`}
                  title={`Expires: ${fmtDatetime(expiresAt)}`}
                >
                  Exp: {fmtDate(expiresAt)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "finalVerdict",
        header: "Verdict",
        accessorFn: (r) => r.finalVerdict ?? "",
        cell: ({ row }) =>
          row.original.finalVerdict ? (
            <span
              className={`inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${getVerdictBadge(row.original.finalVerdict)}`}
            >
              {row.original.finalVerdict.replace(/_/g, " ")}
            </span>
          ) : (
            <span className="text-[var(--text-secondary)] text-xs font-medium italic whitespace-nowrap">Pending</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-[var(--text-secondary)] text-xs font-medium">{fmtDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: "endedAt",
        header: "Ended",
        sortingFn: (a, b) =>
          new Date(a.original.endedAt ?? 0).getTime() - new Date(b.original.endedAt ?? 0).getTime(),
        cell: ({ row }) => (
          row.original.endedAt ? (
            <span className="text-[var(--text-secondary)] text-xs font-medium" title={fmtDatetime(row.original.endedAt)}>
              {fmtDate(row.original.endedAt)}
            </span>
          ) : (
            <span className="text-[var(--text-secondary)] text-xs italic">—</span>
          )
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => {
          const isReviewing = reviewingId === row.original.id;
          const isDeleting = deletingId === row.original.id;
          const isBusy = isReviewing || isDeleting;

          return (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => handleReview(row.original.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Review
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row.original.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                title="Delete interview"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          );
        },
      },
    ],
    [deletingId, handleDelete, handleReview, reviewingId]
  );

  if (loading) return <LoadingSpinner message="Loading interviews..." />;

  const reviewPending = interviews.filter((i) => i.status === "REVIEW_PENDING").length;
  const completed = interviews.filter((i) => i.status === "COMPLETED").length;
  const signedOff = interviews.filter((i) => i.status === "SIGNED_OFF").length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in">
      {/* ── Stat Cards Bar ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel-card p-4 flex items-center justify-between rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-[var(--surface)] shadow-xs hover:border-blue-500/40 transition-all">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total</p>
            <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">{interviews.length}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>

        <div className="panel-card p-4 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-[var(--surface)] shadow-xs hover:border-amber-500/40 transition-all">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Review Pending</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{reviewPending}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="panel-card p-4 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-[var(--surface)] shadow-xs hover:border-emerald-500/40 transition-all">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{completed}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="panel-card p-4 flex items-center justify-between rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-[var(--surface)] shadow-xs hover:border-purple-500/40 transition-all">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Signed Off</p>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">{signedOff}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-2xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Filter Container ── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-indigo rounded-t-2xl flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Filter className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Filter Interviews
            </h2>
            <span className="text-xs font-medium text-[var(--text-secondary)]">Refine candidate evaluation records</span>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Status</label>
                <Select
                  value={filter.status || "ALL"}
                  onValueChange={(val) => setFilter((prev) => ({ ...prev, status: val === "ALL" ? "" : val }))}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs font-semibold">All Statuses</SelectItem>
                    <SelectItem value="DRAFT" className="text-xs font-semibold">Draft</SelectItem>
                    <SelectItem value="SCHEDULED" className="text-xs font-semibold">Scheduled</SelectItem>
                    <SelectItem value="IN_PROGRESS" className="text-xs font-semibold">In Progress</SelectItem>
                    <SelectItem value="REVIEW_PENDING" className="text-xs font-semibold">Review Pending</SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs font-semibold">Completed</SelectItem>
                    <SelectItem value="SIGNED_OFF" className="text-xs font-semibold">Signed Off</SelectItem>
                    <SelectItem value="EXPIRED" className="text-xs font-semibold">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Mode</label>
                <Select
                  value={filter.mode || "ALL"}
                  onValueChange={(val) => setFilter((prev) => ({ ...prev, mode: val === "ALL" ? "" : val }))}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs font-semibold">All Modes</SelectItem>
                    <SelectItem value="SCREENING" className="text-xs font-semibold">Screening</SelectItem>
                    <SelectItem value="L1" className="text-xs font-semibold">L1</SelectItem>
                    <SelectItem value="L2" className="text-xs font-semibold">L2</SelectItem>
                    <SelectItem value="L3" className="text-xs font-semibold">L3</SelectItem>
                    <SelectItem value="L4" className="text-xs font-semibold">L4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Verdict</label>
                <Select
                  value={filter.verdict || "ALL"}
                  onValueChange={(val) => setFilter((prev) => ({ ...prev, verdict: val === "ALL" ? "" : val }))}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                    <SelectValue placeholder="All Verdicts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs font-semibold">All Verdicts</SelectItem>
                    <SelectItem value="READY" className="text-xs font-semibold">Ready</SelectItem>
                    <SelectItem value="NEEDS_1_WEEK_PREP" className="text-xs font-semibold">Needs 1 Week Prep</SelectItem>
                    <SelectItem value="NEEDS_RESKILLING" className="text-xs font-semibold">Needs Reskilling</SelectItem>
                    <SelectItem value="MISMATCH_WITH_JD" className="text-xs font-semibold">Mismatch with JD</SelectItem>
                    <SelectItem value="WITHDRAWN" className="text-xs font-semibold">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Interviews Directory
            </h2>
            <span className="text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full border border-purple-500/20">
              {filteredInterviews.length} Records
            </span>
          </div>

          <div className="p-5">
            {filteredInterviews.length === 0 ? (
              <EmptyState
                title="No interviews found"
                description="No interview records match the current filter criteria."
                icon={ClipboardList}
              />
            ) : (
              <EnhancedDataTable<InterviewSummary>
                tableId="admin-review-interviews"
                data={filteredInterviews}
                columns={interviewColumns}
                getRowId={(r) => r.id}
                toolbar={({ columnsButton }) => (
                  <DataTableToolbar
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search candidate or role..."
                  >
                    {columnsButton}
                  </DataTableToolbar>
                )}
                emptyMessage={
                  <EmptyState
                    title="No interviews found"
                    description="No interview records match the current filter criteria."
                    icon={ClipboardList}
                  />
                }
                pageSize={12}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


