"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Calendar,
  Trash2,
  Users,
  X,
  Search,
  Pencil,
  Eye,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import { QB_ROUNDS, ROUND_COLORS, IMPORTANCE_COLORS } from "@/lib/questionbank-constants";
import { MasterDataEmptyState, MasterDataLoading } from "@/components/admin/master-data/MasterDataUi";

interface SessionQuestion {
  id: string;
  text: string;
  category: string;
  tags: string[];
  relevancyLabel: string | null;
}

interface SessionDetail {
  id: string;
  candidateName: string;
  companyName: string;
  round: string;
  interviewDate: string;
  interviewerName?: string;
  questions: SessionQuestion[];
}

interface Session {
  id: string;
  candidateName: string;
  companyName: string;
  companySlug: string;
  round: string;
  interviewDate: string;
  interviewerName?: string;
  questionCount?: number;
}

interface Company { id: string; name: string; slug: string; }

const PAGE_SIZE = 20;

export default function QuestionBankSessionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "0"));
  const [totalPages, setTotalPages] = useState(0);

  const [candidate, setCandidate] = useState(searchParams.get("candidate") ?? "");
  const [company, setCompany] = useState(searchParams.get("company") ?? "");
  const [round, setRound] = useState(searchParams.get("round") ?? "");
  const [companies, setCompanies] = useState<Company[]>([]);

  // Detail view
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit session
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editRound, setEditRound] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editInterviewer, setEditInterviewer] = useState("");
  const [editCandidate, setEditCandidate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch("/api/questionbank/companies")
      .then(r => r.json())
      .then(data => { if (data.success) setCompanies(data.data); })
      .catch(() => {});
  }, []);

  const pushUrl = (overrides: { page?: number; candidate?: string; company?: string; round?: string }) => {
    const params = new URLSearchParams();
    const ca = overrides.candidate ?? candidate;
    const co = overrides.company ?? company;
    const ro = overrides.round ?? round;
    const pg = overrides.page ?? page;
    if (ca) params.set("candidate", ca);
    if (co) params.set("company", co);
    if (ro) params.set("round", ro);
    if (pg > 0) params.set("page", String(pg));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const fetchSessions = (overrides: { pageNum?: number; candidateVal?: string; companyVal?: string; roundVal?: string } = {}) => {
    const pg = overrides.pageNum ?? page;
    const ca = overrides.candidateVal ?? candidate;
    const co = overrides.companyVal ?? company;
    const ro = overrides.roundVal ?? round;

    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(pg));
    params.set("size", String(PAGE_SIZE));
    if (ca.trim()) params.set("candidate", ca.trim());
    if (co) params.set("company", co);
    if (ro) params.set("round", ro);

    pushUrl({ page: pg, candidate: ca, company: co, round: ro });

    fetch(`/api/questionbank/sessions?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.data)) {
            setSessions(data.data);
            setTotalElements(data.data.length);
            setTotalPages(1);
          } else {
            setSessions(data.data.content ?? []);
            setTotalPages(data.data.page?.totalPages ?? 1);
            setTotalElements(data.data.page?.totalElements ?? 0);
          }
          setPage(pg);
        } else {
          toast(data.message || "Failed to load sessions", "error");
        }
      })
      .catch(() => toast("Failed to load sessions", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setCandidate("");
    setCompany("");
    setRound("");
    fetchSessions({ pageNum: 0, candidateVal: "", companyVal: "", roundVal: "" });
  };

  const hasActiveFilters = candidate || company || round;

  const handleDelete = async (session: Session) => {
    const ok = await confirm({
      title: "Delete session?",
      message: `Delete the ${session.round} session for ${session.candidateName} at ${session.companyName}${session.questionCount ? ` (${session.questionCount} question${session.questionCount !== 1 ? "s" : ""})` : ""}? The questions themselves will not be deleted. This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/questionbank/sessions/${session.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
        toast("Session deleted", "success");
      } else {
        toast(data.message || "Failed to delete session", "error");
      }
    } catch {
      toast("Failed to delete session", "error");
    }
  };

  const handleViewDetail = async (sessionId: string) => {
    setDetailLoading(true);
    setDetailSession(null);
    try {
      const res = await fetch(`/api/questionbank/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success) setDetailSession(data.data);
      else toast(data.message || "Failed to load session details", "error");
    } catch {
      toast("Failed to load session details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (session: Session) => {
    setEditingSession(session);
    setEditRound(session.round);
    setEditDate(session.interviewDate ? session.interviewDate.split("T")[0] : "");
    setEditInterviewer(session.interviewerName ?? "");
    setEditCandidate(session.candidateName);
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/questionbank/sessions/${editingSession.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: editCandidate,
          round: editRound,
          interviewDate: editDate || null,
          interviewerName: editInterviewer || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingSession(null);
        fetchSessions();
        toast("Session updated", "success");
      } else {
        toast(data.message || "Failed to update session", "error");
      }
    } catch {
      toast("Failed to update session", "error");
    } finally {
      setEditSaving(false);
    }
  };

  const getRoundColor = (r: string) => ROUND_COLORS[r] || "bg-muted text-muted-foreground";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Filter Panel Card */}
      <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-blue-300/30">
        <div className="panel-header panel-header-accent-blue flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">Filter Interview Sessions</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-3 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                Candidate Name
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <Input
                  value={candidate}
                  onChange={(e) => setCandidate(e.target.value)}
                  placeholder="Search candidate..."
                  className="pl-9 text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-medium"
                  onKeyDown={(e) => e.key === "Enter" && fetchSessions({ pageNum: 0 })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                Company Target
              </label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-semibold">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[var(--border)]">
                  <SelectItem value="">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                Interview Round
              </label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger className="text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-semibold">
                  <SelectValue placeholder="All Rounds" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[var(--border)]">
                  <SelectItem value="">All Rounds</SelectItem>
                  {QB_ROUNDS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button
                onClick={() => fetchSessions({ pageNum: 0 })}
                className="w-full rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Search className="h-4 w-4 mr-1.5" />
                Search Sessions
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Repository Card */}
      <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
        <div className="panel-header panel-header-accent-purple flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Sessions Directory
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
            {totalElements > 0
              ? `${totalElements} ${totalElements === 1 ? "session" : "sessions"}`
              : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`}
          </span>
        </div>

        <div className="p-5">
          {loading ? (
            <MasterDataLoading label="Loading interview sessions..." />
          ) : sessions.length === 0 ? (
            <div className="space-y-4 text-center">
              <MasterDataEmptyState
                icon={Calendar}
                title="No interview sessions found"
                description={
                  hasActiveFilters
                    ? "No sessions match your selected filter criteria."
                    : "Sessions will appear automatically when you ingest question bank data."
                }
              />
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs cursor-pointer"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">
                    <th className="p-3.5">Candidate</th>
                    <th className="p-3.5">Target Company</th>
                    <th className="p-3.5">Round</th>
                    <th className="p-3.5">Interview Date</th>
                    <th className="p-3.5">Interviewer</th>
                    <th className="p-3.5 text-center">Questions</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="transition-colors duration-150 hover:bg-purple-500/5"
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                            {session.candidateName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {session.candidateName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-xs text-[var(--text-primary)]">
                          {session.companyName}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${getRoundColor(
                            session.round
                          )}`}
                        >
                          {session.round}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-[var(--text-secondary)]">
                        {formatDate(session.interviewDate)}
                      </td>
                      <td className="p-3.5 font-medium text-[var(--text-secondary)]">
                        {session.interviewerName || "—"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                          {session.questionCount || 0}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 rounded-lg text-xs font-bold border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 hover:scale-105 transition-all"
                            onClick={() => handleViewDetail(session.id)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 rounded-lg border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 hover:scale-105 transition-all"
                            onClick={() => openEdit(session)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 rounded-lg border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:scale-105 transition-all"
                            onClick={() => handleDelete(session)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSessions({ pageNum: page - 1 })}
                  disabled={page === 0}
                  className="h-8 rounded-xl text-xs font-bold border-[var(--border)] bg-[var(--surface)] disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSessions({ pageNum: page + 1 })}
                  disabled={page >= totalPages - 1}
                  className="h-8 rounded-xl text-xs font-bold border-[var(--border)] bg-[var(--surface)] disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      <Dialog
        open={detailLoading || !!detailSession}
        onOpenChange={(open) => {
          if (!open) {
            setDetailSession(null);
            setDetailLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
          <DialogHeader className="border-b border-[var(--border)] pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold text-[var(--text-primary)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span>
                  {detailLoading
                    ? "Loading session details..."
                    : detailSession
                    ? `${detailSession.candidateName} — ${detailSession.companyName}`
                    : ""}
                </span>
                {detailSession && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-extrabold uppercase text-purple-600 border border-purple-500/20">
                    {detailSession.round}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <MasterDataLoading label="Retrieving recorded session questions..." />
          ) : detailSession ? (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-xs">
                <div>
                  <span className="text-[var(--text-secondary)] font-semibold block">Interview Date</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {formatDate(detailSession.interviewDate, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] font-semibold block">Interviewer</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {detailSession.interviewerName || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] font-semibold block">Total Questions</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {detailSession.questions?.length ?? 0} Questions
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  Recorded Questions
                </h4>
                {!detailSession.questions?.length ? (
                  <p className="text-xs font-semibold text-[var(--text-secondary)] text-center py-6">
                    No questions recorded for this interview session.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detailSession.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-xs font-bold border border-purple-500/20">
                            Q{idx + 1}
                          </span>
                          <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed">
                            {q.text}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pl-9">
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                            {q.category}
                          </span>
                          {q.relevancyLabel && (
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                IMPORTANCE_COLORS[q.relevancyLabel] ?? "bg-zinc-500/10 text-zinc-700"
                              }`}
                            >
                              {q.relevancyLabel}
                            </span>
                          )}
                          {q.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-300 border border-teal-500/20 font-mono"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Session Edit Modal */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent className="max-w-md rounded-2xl border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
          <DialogHeader className="border-b border-[var(--border)] pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Pencil className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Edit Interview Session
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                Candidate Name
              </label>
              <Input
                value={editCandidate}
                onChange={(e) => setEditCandidate(e.target.value)}
                className="text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                Interview Round
              </label>
              <Select value={editRound} onValueChange={setEditRound}>
                <SelectTrigger className="text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[var(--border)]">
                  {QB_ROUNDS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                Interview Date
              </label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                Interviewer Name
              </label>
              <Input
                value={editInterviewer}
                onChange={(e) => setEditInterviewer(e.target.value)}
                placeholder="Optional"
                className="text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="outline"
                onClick={() => setEditingSession(null)}
                className="h-8 rounded-xl text-xs font-bold border-[var(--border)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editSaving || !editCandidate.trim()}
                className="h-8 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
              >
                {editSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
