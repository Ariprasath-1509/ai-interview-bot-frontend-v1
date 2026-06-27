"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Calendar, Trash2, Users, X, Search, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground font-mono">FILTER SESSIONS</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Candidate Name</label>
              <Input
                value={candidate}
                onChange={(e) => setCandidate(e.target.value)}
                placeholder="Search candidate..."
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && fetchSessions({ pageNum: 0 })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Round</label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {QB_ROUNDS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => fetchSessions({ pageNum: 0 })} className="w-full gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sessions found</p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters} className="mt-4">Reset Filters</Button>
            ) : (
              <p className="text-sm text-muted-foreground">Sessions are created when you ingest interview data</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {totalElements > 0 ? `${totalElements} Session${totalElements !== 1 ? "s" : ""}` : `${sessions.length} Session${sessions.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Candidate</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Company</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Round</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Interviewer</th>
                    <th className="p-3 text-center text-sm font-medium text-muted-foreground">Questions</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{session.candidateName}</span>
                        </div>
                      </td>
                      <td className="p-3">{session.companyName}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoundColor(session.round)}`}>
                          {session.round}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {session.interviewDate ? new Date(session.interviewDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-3 text-muted-foreground">{session.interviewerName || "-"}</td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium">{session.questionCount || 0}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewDetail(session.id)}>
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(session)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(session)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchSessions({ pageNum: page - 1 })} disabled={page === 0}>
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => fetchSessions({ pageNum: page + 1 })} disabled={page >= totalPages - 1}>
            Next
          </Button>
        </div>
      )}

      {/* Session Detail Dialog */}
      <Dialog open={detailLoading || !!detailSession} onOpenChange={(open) => { if (!open) { setDetailSession(null); setDetailLoading(false); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailLoading ? "Loading session..." : detailSession ? `${detailSession.candidateName} — ${detailSession.companyName} · ${detailSession.round}` : ""}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : detailSession ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm border-b pb-4">
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {detailSession.interviewDate ? new Date(detailSession.interviewDate).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Interviewer</span>
                  <p className="font-medium">{detailSession.interviewerName || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {detailSession.questions?.length ?? 0} Question{(detailSession.questions?.length ?? 0) !== 1 ? "s" : ""}
                </p>
                {!detailSession.questions?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No questions recorded for this session</p>
                ) : (
                  <div className="space-y-3">
                    {detailSession.questions.map((q, idx) => (
                      <div key={q.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">Q{idx + 1}</span>
                          <p className="text-sm font-medium leading-snug">{q.text}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">{q.category}</span>
                          {q.relevancyLabel && (
                            <span className={`text-xs px-2 py-0.5 rounded ${IMPORTANCE_COLORS[q.relevancyLabel] ?? "bg-muted"}`}>
                              {q.relevancyLabel}
                            </span>
                          )}
                          {q.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">#{tag}</span>
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

      {/* Session Edit Dialog */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Candidate Name</label>
              <Input value={editCandidate} onChange={(e) => setEditCandidate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Round</label>
              <Select value={editRound} onValueChange={setEditRound}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QB_ROUNDS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Interview Date</label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Interviewer Name</label>
              <Input value={editInterviewer} onChange={(e) => setEditInterviewer(e.target.value)} className="mt-1" placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingSession(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={editSaving || !editCandidate.trim()}>
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
