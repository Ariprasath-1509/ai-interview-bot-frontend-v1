"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckSquare, Square, ChevronRight, ChevronLeft, Users, Settings, Building2, Send, CheckCircle, XCircle, Loader2, Search } from "lucide-react";

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
};

type CandidateRow = {
  candidate: Candidate;
  clientId: string;  // "" = no client
};

type SharedConfig = {
  jdTitle: string;
  jdText: string;
  interviewMode: "SCREENING" | "L1" | "L2" | "L3" | "L4";
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

  useEffect(() => {
    if (step !== 2) return;
    fetch("/api/recruiter/clients/for-interview", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { clients?: Client[] } | Client[]) => {
        const list = Array.isArray(d) ? d : (d as { clients?: Client[] }).clients ?? [];
        setClients(list);
      })
      .catch(() => setClients([]));
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/interviews/create" className="btn-secondary text-sm">← Interviews</Link>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Bulk Interview Creation</h1>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                ${i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-zinc-300" />}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 0: Select Candidates ── */}
      {step === 0 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Select Candidates</h2>
            <span className="ml-auto text-sm text-zinc-500">{selected.length} selected (max 20)</span>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              className="input w-full pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {searching ? (
            <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              {candidateResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">No candidates found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/80">
                    <tr>
                      <th className="w-10 px-3 py-2 text-left"></th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">YOP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateResults.map((c) => {
                      const sel = isSelected(c);
                      const maxed = !sel && selected.length >= 20;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => !maxed && toggleCandidate(c)}
                          className={`cursor-pointer border-t border-zinc-100 dark:border-zinc-700/50 transition-colors
                            ${sel ? "bg-violet-50 dark:bg-violet-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"}
                            ${maxed ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          <td className="px-3 py-2">
                            {sel
                              ? <CheckSquare className="h-4 w-4 text-violet-600" />
                              : <Square className="h-4 w-4 text-zinc-300" />}
                          </td>
                          <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{c.name}</td>
                          <td className="px-3 py-2 text-zinc-500">{c.email}</td>
                          <td className="px-3 py-2 text-zinc-400">{c.yop ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {selected.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {c.name}
                  <button onClick={() => toggleCandidate(c)} className="ml-0.5 hover:text-violet-900">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: Configure Interview ── */}
      {step === 1 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Interview Configuration (shared for all {selected.length} candidates)</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">JD Title *</label>
              <input className="input w-full" value={config.jdTitle} onChange={(e) => setConfig((p) => ({ ...p, jdTitle: e.target.value }))} placeholder="e.g. Senior DevOps Engineer" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">JD Text</label>
              <textarea className="input w-full" rows={5} value={config.jdText} onChange={(e) => setConfig((p) => ({ ...p, jdText: e.target.value }))} placeholder="Paste job description here…" />
            </div>
            <div>
              <label className="label">Interview Mode *</label>
              <select className="input w-full" value={config.interviewMode} onChange={(e) => setConfig((p) => ({ ...p, interviewMode: e.target.value as SharedConfig["interviewMode"] }))}>
                {MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Custom Duration (min)</label>
              <input className="input w-full" type="number" min={5} max={180} value={config.customDurationMinutes} onChange={(e) => setConfig((p) => ({ ...p, customDurationMinutes: e.target.value }))} placeholder="Leave blank for default" />
            </div>
            <div>
              <label className="label">Scheduled At</label>
              <input className="input w-full" type="datetime-local" value={config.scheduledAt} onChange={(e) => setConfig((p) => ({ ...p, scheduledAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Expires At (common for all)</label>
              <input className="input w-full" type="datetime-local" value={config.expiresAt} onChange={(e) => setConfig((p) => ({ ...p, expiresAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Round Name</label>
              <input className="input w-full" value={config.roundName} onChange={(e) => setConfig((p) => ({ ...p, roundName: e.target.value }))} placeholder="e.g. Hands-On, Technical Screen" />
            </div>
            <div>
              <label className="label">Focus Areas</label>
              <input className="input w-full" value={config.focusAreas} onChange={(e) => setConfig((p) => ({ ...p, focusAreas: e.target.value }))} placeholder="e.g. Kubernetes, Terraform" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-4 w-4 rounded accent-violet-600" checked={config.includeProgrammingQuestions} onChange={(e) => setConfig((p) => ({ ...p, includeProgrammingQuestions: e.target.checked }))} />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Include coding / programming questions</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Assign Clients ── */}
      {step === 2 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Client Assignment</h2>
          </div>
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded accent-violet-600" checked={sameClient} onChange={(e) => setSameClient(e.target.checked)} />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Same client for all candidates</span>
            </label>
          </div>
          {sameClient ? (
            <div>
              <label className="label">Client (optional)</label>
              <select className="input w-full" value={globalClientId} onChange={(e) => setGlobalClientId(e.target.value)}>
                <option value="">— No client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
              </select>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">Candidate</th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">Client</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.candidate.email} className="border-t border-zinc-100 dark:border-zinc-700/50">
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">{r.candidate.name}</td>
                      <td className="px-4 py-2 text-zinc-500">{r.candidate.email}</td>
                      <td className="px-4 py-2">
                        <select className="input w-full" value={r.clientId} onChange={(e) => setRowClient(r.candidate.email, e.target.value)}>
                          <option value="">— No client —</option>
                          {clients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Review & Submit ── */}
      {step === 3 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Review & Submit</h2>
          </div>

          {/* Config summary */}
          <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Interview Config</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <span className="text-zinc-500">JD Title</span><span className="col-span-1 font-medium text-zinc-900 dark:text-zinc-50 sm:col-span-2">{config.jdTitle}</span>
              <span className="text-zinc-500">Mode</span><span className="col-span-1 sm:col-span-2">{config.interviewMode}{config.customDurationMinutes ? ` · ${config.customDurationMinutes} min` : ""}</span>
              <span className="text-zinc-500">Coding</span><span className="col-span-1 sm:col-span-2">{config.includeProgrammingQuestions ? "Yes" : "No"}</span>
              {config.scheduledAt && <><span className="text-zinc-500">Scheduled</span><span className="col-span-1 sm:col-span-2">{new Date(config.scheduledAt).toLocaleString()}</span></>}
              {config.expiresAt && <><span className="text-zinc-500">Expires</span><span className="col-span-1 sm:col-span-2">{new Date(config.expiresAt).toLocaleString()}</span></>}
              {config.roundName && <><span className="text-zinc-500">Round</span><span className="col-span-1 sm:col-span-2">{config.roundName}</span></>}
            </div>
          </div>

          {/* Candidate table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Candidate</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Client</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const clientId = sameClient ? globalClientId : r.clientId;
                  const clientName = clients.find((c) => c.id === clientId)?.clientName ?? "—";
                  return (
                    <tr key={r.candidate.email} className="border-t border-zinc-100 dark:border-zinc-700/50">
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">{r.candidate.name}</td>
                      <td className="px-4 py-2 text-zinc-500">{r.candidate.email}</td>
                      <td className="px-4 py-2 text-zinc-400">{clientName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {submitError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{submitError}</p>}
        </div>
      )}

      {/* ── STEP 4: Results ── */}
      {step === 4 && result && (
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Bulk Creation Complete</h2>
          </div>
          <p className="mb-4 text-sm text-zinc-500">
            {result.results.filter((r) => r.status === "OK").length} created ·{" "}
            {result.results.filter((r) => r.status === "FAILED").length} failed
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Interview / Error</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.email} className="border-t border-zinc-100 dark:border-zinc-700/50">
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{r.email}</td>
                    <td className="px-4 py-2">
                      {r.status === "OK"
                        ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle className="h-3.5 w-3.5" /> Created</span>
                        : <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> Failed</span>}
                    </td>
                    <td className="px-4 py-2">
                      {r.status === "OK" && r.interviewId
                        ? <Link href={`/admin/interviews/${r.interviewId}/review`} className="text-violet-600 hover:underline">{r.interviewId}</Link>
                        : <span className="text-zinc-400 dark:text-zinc-500 text-xs">{r.error ?? "—"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-3">
            <Link href="/admin/interviews/create" className="btn-primary">Go to Interviews</Link>
            <button className="btn-secondary" onClick={() => { setStep(0); setSelected([]); setResult(null); }}>Create Another Batch</button>
          </div>
        </div>
      )}

      {/* ── Navigation buttons ── */}
      {step < 4 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            className="btn-secondary"
            onClick={() => step === 0 ? window.history.back() : setStep((s) => s - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button className="btn-primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button className="btn-primary" disabled={submitting} onClick={handleSubmit}>
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating {selected.length} interviews…</>
                : <><Send className="h-4 w-4" /> Create {selected.length} Interviews</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
