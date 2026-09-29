"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { CheckSquare, Square, ChevronRight, ChevronLeft, Users, Settings, Building2, Send, CheckCircle, XCircle, Loader2, Search } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Types ────────────────────────────────────────────────────────────────────

type Candidate = {
  id: string;
  email: string;
  name: string;
  resumeSummary?: string;
  yop?: number | null;
};

type Client = {
  id: string;
  clientName: string;
  jdRole?: string;
  jdDescription?: string;
};

type CandidateRow = {
  candidate: Candidate;
  clientId: string;  // "" = no client
};

type SharedConfig = {
  jdTitle: string;
  jdText: string;
  interviewMode: "SCREENING" | "L1" | "L2" | "L3" | "L4";
  questionDifficulty: "" | "EASY" | "MEDIUM" | "HARD"; // "" = auto from mode
  assessmentType: "CLIENT_INTERVIEW" | "ONBOARDING";
  customDurationMinutes: string;
  includeProgrammingQuestions: boolean;
  scheduledAt: string;
  expiresAt: string;
  roundName: string;
  focusAreas: string;
};

type BulkResult = {
  results: { email: string; status: "OK" | "FAILED"; interviewId?: string; error?: string }[];
};

const STEPS = ["Select Candidates", "Configure Interview", "Assign Clients", "Review & Submit"] as const;

const MODE_OPTIONS = ["SCREENING", "L1", "L2", "L3", "L4"] as const;

// ── Component ────────────────────────────────────────────────────────────────

export function BulkCreateClient() {
  const [step, setStep] = useState(0);

  // Step 1 state
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidateResults, setCandidateResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate[]>([]);

  // Step 2 state
  const [config, setConfig] = useState<SharedConfig>({
    jdTitle: "",
    jdText: "",
    interviewMode: "L1",
    questionDifficulty: "",
    assessmentType: "CLIENT_INTERVIEW",
    customDurationMinutes: "",
    includeProgrammingQuestions: true,
    scheduledAt: "",
    expiresAt: "",
    roundName: "",
    focusAreas: "",
  });

  // Step 3 state
  const [clients, setClients] = useState<Client[]>([]);
  const [sameClient, setSameClient] = useState(true);
  const [globalClientId, setGlobalClientId] = useState("");
  const [rows, setRows] = useState<CandidateRow[]>([]);

  // Step 4 state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [submitError, setSubmitError] = useState("");

  // ── Candidate search ───────────────────────────────────────────────────────

  const searchCandidates = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/candidates?search=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json() as { candidates?: Candidate[]; content?: Candidate[] } | Candidate[];
        const list = Array.isArray(data) ? data
          : (data as { candidates?: Candidate[]; content?: Candidate[] }).candidates
          ?? (data as { content?: Candidate[] }).content
          ?? [];
        setCandidateResults(list);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    searchCandidates("");
  }, [searchCandidates]);

  useEffect(() => {
    const t = setTimeout(() => searchCandidates(search), 350);
    return () => clearTimeout(t);
  }, [search, searchCandidates]);

  // ── Client fetch ───────────────────────────────────────────────────────────

  // Fetch clients on mount — needed by the Configure step (JD auto-fill) and the Assign step
  useEffect(() => {
    fetch("/api/recruiter/clients/for-interview", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { clients?: Client[] } | Client[]) => {
        const list = Array.isArray(d) ? d : (d as { clients?: Client[] }).clients ?? [];
        setClients(list);
      })
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    // Initialise per-candidate rows when entering step 3
    setRows(selected.map((c) => ({ candidate: c, clientId: "" })));
  }, [step, selected]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleCandidate(c: Candidate) {
    setSelected((prev) =>
      prev.find((x) => x.id === c.id) ? prev.filter((x) => x.id !== c.id) : [...prev, c]
    );
  }

  function isSelected(c: Candidate) {
    return !!selected.find((x) => x.id === c.id);
  }

  function setRowClient(email: string, clientId: string) {
    setRows((prev) => prev.map((r) => r.candidate.email === email ? { ...r, clientId } : r));
  }

  /** The client whose JD was last applied — lets us re-sync on client change without clobbering manual edits. */
  const autoFilledFromClientRef = useRef<Client | null>(null);

  /**
   * Select the shared client and auto-fill JD title/text from its position.
   * A field is only overwritten when it is empty or still holds the previous
   * client's auto-filled value (i.e. the recruiter hasn't hand-edited it).
   */
  function selectClientAndFillJd(clientId: string) {
    setGlobalClientId(clientId);
    if (clientId) setSameClient(true);
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      autoFilledFromClientRef.current = null;
      return;
    }
    const prev = autoFilledFromClientRef.current;
    setConfig((p) => {
      const titleUntouched = !p.jdTitle.trim() || (prev != null && p.jdTitle === (prev.jdRole ?? ""));
      const textUntouched = !p.jdText.trim() || (prev != null && p.jdText === (prev.jdDescription ?? ""));
      return {
        ...p,
        jdTitle: titleUntouched && client.jdRole ? client.jdRole : p.jdTitle,
        jdText: textUntouched && client.jdDescription ? client.jdDescription : p.jdText,
      };
    });
    autoFilledFromClientRef.current = client;
  }

  function canNext() {
    if (step === 0) return selected.length > 0;
    if (step === 1) return config.jdTitle.trim() !== "";
    if (step === 2) return true;
    return false;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const candidates = rows.map((r) => ({
        engineerEmail: r.candidate.email,
        engineerName: r.candidate.name,
        resumeSummary: r.candidate.resumeSummary ?? "",
        clientId: sameClient ? (globalClientId || null) : (r.clientId || null),
      }));

      const payload = {
        jdTitle: config.jdTitle,
        jdText: config.jdText || null,
        interviewMode: config.interviewMode,
        questionDifficulty: config.questionDifficulty || null,
        assessmentType: config.assessmentType,
        customDurationMinutes: config.customDurationMinutes ? Number(config.customDurationMinutes) : null,
        includeProgrammingQuestions: config.includeProgrammingQuestions,
        scheduledAt: config.scheduledAt ? new Date(config.scheduledAt).toISOString() : null,
        expiresAt: config.expiresAt ? new Date(config.expiresAt).toISOString() : null,
        roundName: config.roundName || null,
        focusAreas: config.focusAreas || null,
        candidates,
      };

      const res = await fetch("/api/interviews/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json() as BulkResult;
      setResult(data);
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/interviews/create"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] shadow-2xs transition-all hover:bg-[var(--surface-subtle)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
        >
          ← Single Interview
        </Link>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          Generate up to 20 candidate assessment links in one batch
        </span>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                i < step
                  ? "bg-emerald-500 text-white shadow-xs"
                  : i === step
                  ? "bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white shadow-xs ring-2 ring-purple-400/30"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-bold ${
                i === step ? "text-[#6D28D9] dark:text-purple-400" : "text-[var(--text-secondary)]"
              }`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] opacity-40" />}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 0: Select Candidates ── */}
      {step === 0 && (
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Select Candidates
            </h2>
            <span className="text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full border border-purple-500/20">
              {selected.length} / 20 Selected
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9] transition-all"
                placeholder="Search candidates by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {searching ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-[var(--text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> Searching candidates...
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {candidateResults.length === 0 ? (
                  <p className="py-12 text-center text-xs font-medium text-[var(--text-secondary)]">No candidates found</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--surface-subtle)] border-b border-[var(--border)] font-bold text-[var(--text-secondary)]">
                      <tr>
                        <th className="w-10 px-3.5 py-2.5 text-left"></th>
                        <th className="px-3.5 py-2.5 text-left">Name</th>
                        <th className="px-3.5 py-2.5 text-left">Email</th>
                        <th className="px-3.5 py-2.5 text-left">YOP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {candidateResults.map((c) => {
                        const sel = isSelected(c);
                        const maxed = !sel && selected.length >= 20;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => !maxed && toggleCandidate(c)}
                            className={`cursor-pointer transition-colors ${
                              sel
                                ? "bg-purple-500/10 dark:bg-purple-950/30"
                                : "hover:bg-[var(--surface-subtle)]"
                            } ${maxed ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <td className="px-3.5 py-2.5">
                              {sel
                                ? <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                : <Square className="h-4 w-4 text-[var(--text-secondary)]" />}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-[var(--text-primary)]">{c.name}</td>
                            <td className="px-3.5 py-2.5 font-medium text-[var(--text-secondary)]">{c.email}</td>
                            <td className="px-3.5 py-2.5 text-[var(--text-secondary)]">{c.yop ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selected.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-xs font-bold text-[var(--text-primary)] shadow-2xs">
                    {c.name}
                    <button type="button" onClick={() => toggleCandidate(c)} className="ml-0.5 text-[var(--text-secondary)] hover:text-red-500 cursor-pointer">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 1: Configure Interview ── */}
      {step === 1 && (
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-indigo flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Interview Configuration
            </h2>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Shared for all {selected.length} candidates</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Interview Type</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all duration-200 ${
                    config.assessmentType === "CLIENT_INTERVIEW"
                      ? "border-purple-500/40 bg-purple-500/10 shadow-2xs ring-1 ring-purple-500/30"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-purple-300/40 hover:bg-[var(--surface-subtle)]/60"
                  }`}>
                    <span className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                      <input type="radio" name="bulkAssessmentType" checked={config.assessmentType === "CLIENT_INTERVIEW"}
                        onChange={() => setConfig((p) => ({ ...p, assessmentType: "CLIENT_INTERVIEW" }))} className="h-4 w-4 accent-purple-600" />
                      Client Interview
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">JD-based, scored against a client's role with full evaluation report.</span>
                  </label>
                  <label className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all duration-200 ${
                    config.assessmentType === "ONBOARDING"
                      ? "border-emerald-500/40 bg-emerald-500/10 shadow-2xs ring-1 ring-emerald-500/30"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-emerald-300/40 hover:bg-[var(--surface-subtle)]/60"
                  }`}>
                    <span className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                      <input type="radio" name="bulkAssessmentType" checked={config.assessmentType === "ONBOARDING"}
                        onChange={() => setConfig((p) => ({ ...p, assessmentType: "ONBOARDING" }))} className="h-4 w-4 accent-emerald-600" />
                      Onboarding Assessment
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">Checks basic understanding of one concept — no client required.</span>
                  </label>
                </div>
              </div>

              {config.assessmentType === "CLIENT_INTERVIEW" && (
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Client Position (auto-fills JD)</label>
                  <Select
                    value={globalClientId || "NONE"}
                    onValueChange={(v) => selectClientAndFillJd(v === "NONE" ? "" : v)}
                  >
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium">
                      <SelectValue placeholder="— No client / manual JD —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" className="text-xs font-semibold">— No client / manual JD —</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                          {c.clientName}{c.jdRole ? ` — ${c.jdRole}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                    {globalClientId
                      ? "JD title and text were filled from this client's position — edit them below if needed."
                      : "Selecting a client auto-fills open position requirements for all selected candidates."}
                  </p>
                </div>
              )}

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">{config.assessmentType === "ONBOARDING" ? "Concept / Topic *" : "JD Title *"}</label>
                <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9]" value={config.jdTitle} onChange={(e) => setConfig((p) => ({ ...p, jdTitle: e.target.value }))}
                  placeholder={config.assessmentType === "ONBOARDING" ? "e.g. Java Collections" : "e.g. Senior DevOps Engineer"} />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">{config.assessmentType === "ONBOARDING" ? "Concept description" : "JD Text"}</label>
                <textarea className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9]" rows={5} value={config.jdText} onChange={(e) => setConfig((p) => ({ ...p, jdText: e.target.value }))}
                  placeholder={config.assessmentType === "ONBOARDING" ? "What candidates should understand — key points and scope…" : "Paste job description here…"} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Interview Mode *</label>
                <Select
                  value={config.interviewMode}
                  onValueChange={(v) => setConfig((p) => ({ ...p, interviewMode: v as SharedConfig["interviewMode"] }))}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs font-semibold">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Custom Duration (min)</label>
                <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9]" type="number" min={5} max={180} value={config.customDurationMinutes} onChange={(e) => setConfig((p) => ({ ...p, customDurationMinutes: e.target.value }))} placeholder="Leave blank for default" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Question Difficulty</label>
                <Select
                  value={config.questionDifficulty || "AUTO"}
                  onValueChange={(v) => setConfig((p) => ({ ...p, questionDifficulty: (v === "AUTO" ? "" : v) as SharedConfig["questionDifficulty"] }))}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO" className="text-xs font-semibold">Auto (based on mode)</SelectItem>
                    <SelectItem value="EASY" className="text-xs font-semibold">Easy</SelectItem>
                    <SelectItem value="MEDIUM" className="text-xs font-semibold">Medium</SelectItem>
                    <SelectItem value="HARD" className="text-xs font-semibold">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Scheduled At</label>
                <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9]" type="datetime-local" value={config.scheduledAt} onChange={(e) => setConfig((p) => ({ ...p, scheduledAt: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Expires At (common for all)</label>
                <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9]" type="datetime-local" value={config.expiresAt} onChange={(e) => setConfig((p) => ({ ...p, expiresAt: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Round Name</label>
                <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9]" value={config.roundName} onChange={(e) => setConfig((p) => ({ ...p, roundName: e.target.value }))} placeholder="e.g. Technical Screen" />
              </div>

              {config.assessmentType === "CLIENT_INTERVIEW" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Focus Areas</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-0 focus:border-[#6D28D9]" value={config.focusAreas} onChange={(e) => setConfig((p) => ({ ...p, focusAreas: e.target.value }))} placeholder="e.g. Kubernetes, Terraform" />
                </div>
              )}

              <div className="sm:col-span-2 pt-1">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-colors">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-purple-600" checked={config.includeProgrammingQuestions} onChange={(e) => setConfig((p) => ({ ...p, includeProgrammingQuestions: e.target.checked }))} />
                  <span className="text-xs">
                    <span className="font-bold text-[var(--text-primary)] block">Include coding / programming questions</span>
                    <span className="text-[var(--text-secondary)] font-medium">When enabled, candidates will receive live coding slots with an IDE editor.</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Assign Clients ── */}
      {step === 2 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-purple rounded-t-2xl flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Client Assignment
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {config.assessmentType === "ONBOARDING" ? (
              <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Onboarding assessments aren't tied to a client position — no client assignment required. Continue to Review &amp; Submit.
              </p>
            ) : (
            <>
              <div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded accent-purple-600" checked={sameClient} onChange={(e) => setSameClient(e.target.checked)} />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Same client for all candidates</span>
                </label>
              </div>

              {sameClient ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Client (optional)</label>
                  <Select
                    value={globalClientId || "NONE"}
                    onValueChange={(v) => selectClientAndFillJd(v === "NONE" ? "" : v)}
                  >
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium">
                      <SelectValue placeholder="— No client —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" className="text-xs font-semibold">— No client —</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                          {c.clientName}{c.jdRole ? ` — ${c.jdRole}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)] font-bold text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Candidate</th>
                        <th className="px-4 py-2.5 text-left">Email</th>
                        <th className="px-4 py-2.5 text-left">Client</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {rows.map((r) => (
                        <tr key={r.candidate.email} className="hover:bg-[var(--surface-subtle)] transition-colors">
                          <td className="px-4 py-2.5 font-bold text-[var(--text-primary)]">{r.candidate.name}</td>
                          <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.candidate.email}</td>
                          <td className="px-4 py-2.5">
                            <Select
                              value={r.clientId || "NONE"}
                              onValueChange={(v) => setRowClient(r.candidate.email, v === "NONE" ? "" : v)}
                            >
                              <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-8 font-medium">
                                <SelectValue placeholder="— No client —" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE" className="text-xs font-semibold">— No client —</SelectItem>
                                {clients.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">{c.clientName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: Review & Submit ── */}
      {step === 3 && (
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Send className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Review & Submit
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Config summary */}
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 p-4 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-purple-400">Interview Configuration Summary</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3">
                <span className="font-semibold text-[var(--text-secondary)]">Type</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{config.assessmentType === "ONBOARDING" ? "Onboarding Assessment" : "Client Interview"}</span>
                <span className="font-semibold text-[var(--text-secondary)]">{config.assessmentType === "ONBOARDING" ? "Concept" : "JD Title"}</span><span className="col-span-1 font-bold text-[var(--text-primary)] sm:col-span-2">{config.jdTitle}</span>
                {config.assessmentType === "CLIENT_INTERVIEW" && sameClient && globalClientId && <><span className="font-semibold text-[var(--text-secondary)]">Client</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{clients.find((c) => c.id === globalClientId)?.clientName ?? "—"}</span></>}
                <span className="font-semibold text-[var(--text-secondary)]">Mode</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{config.interviewMode}{config.customDurationMinutes ? ` · ${config.customDurationMinutes} min` : ""}</span>
                <span className="font-semibold text-[var(--text-secondary)]">Coding</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{config.includeProgrammingQuestions ? "Yes" : "No"}</span>
                {config.scheduledAt && <><span className="font-semibold text-[var(--text-secondary)]">Scheduled</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{formatDateTime(config.scheduledAt)}</span></>}
                {config.expiresAt && <><span className="font-semibold text-[var(--text-secondary)]">Expires</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{formatDateTime(config.expiresAt)}</span></>}
                {config.roundName && <><span className="font-semibold text-[var(--text-secondary)]">Round</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{config.roundName}</span></>}
                {config.questionDifficulty && <><span className="font-semibold text-[var(--text-secondary)]">Difficulty</span><span className="col-span-1 sm:col-span-2 font-bold text-[var(--text-primary)]">{config.questionDifficulty}</span></>}
              </div>
            </div>

            {/* Candidate table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)] font-bold text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Candidate</th>
                    <th className="px-4 py-2.5 text-left">Email</th>
                    <th className="px-4 py-2.5 text-left">Assigned Client</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((r) => {
                    const clientId = sameClient ? globalClientId : r.clientId;
                    const clientName = clients.find((c) => c.id === clientId)?.clientName ?? "—";
                    return (
                      <tr key={r.candidate.email} className="hover:bg-[var(--surface-subtle)] transition-colors">
                        <td className="px-4 py-2.5 font-bold text-[var(--text-primary)]">{r.candidate.name}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.candidate.email}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] font-medium">{clientName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {submitError && <p className="text-xs font-bold text-red-600 dark:text-red-400">{submitError}</p>}
          </div>
        </div>
      )}

      {/* ── STEP 4: Results ── */}
      {step === 4 && result && (
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-emerald flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Bulk Creation Complete
            </h2>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {result.results.filter((r) => r.status === "OK").length} Created · {result.results.filter((r) => r.status === "FAILED").length} Failed
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)] font-bold text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Email</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Interview / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {result.results.map((r) => (
                    <tr key={r.email} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">{r.email}</td>
                      <td className="px-4 py-2.5 font-bold">
                        {r.status === "OK"
                          ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Created</span>
                          : <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="h-3.5 w-3.5" /> Failed</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.status === "OK" && r.interviewId
                          ? <Link href={`/admin/interviews/${r.interviewId}/review`} className="text-purple-600 font-bold hover:underline">{r.interviewId}</Link>
                          : <span className="text-[var(--text-secondary)] text-xs">{r.error ?? "—"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/admin/interviews/create" className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer">
                Go to Interviews
              </Link>
              <button
                type="button"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                onClick={() => { setStep(0); setSelected([]); setResult(null); }}
              >
                Create Another Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation buttons ── */}
      {step < 4 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all active:scale-[0.98] cursor-pointer"
            onClick={() => step === 0 ? window.history.back() : setStep((s) => s - 1)}
          >
            <span className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
            </span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating {selected.length} interviews…</>
              ) : (
                <><Send className="h-4 w-4" /> Create {selected.length} Interviews</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
