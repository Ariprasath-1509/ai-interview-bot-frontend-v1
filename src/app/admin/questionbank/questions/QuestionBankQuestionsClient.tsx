"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Plus,
  Upload,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Building2,
  Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExistingMatch {
  id: string;
  text: string;
  similarity: number;
  askedAt: string[];
}

interface ParsedQuestion {
  existingQuestionId: string | null;
  linkToExisting: boolean;
  existingMatch: ExistingMatch | null;
  text: string;
  category: string;
  tags: string[];
}

interface ParsedSession {
  candidateName: string;
  companyName: string;
  round: string;
  date: string;
  interviewerName?: string;
  candidateId?: string | null;
  questions: ParsedQuestion[];
}

interface Category { id: string; name: string; }
interface Company  { id: string; name: string; }
interface UserProfile { id: string; name: string; email: string; }

type Step      = "INPUT" | "PREVIEW" | "SUCCESS";
type InputMode = "PASTE" | "UPLOAD";

interface Progress {
  current: number;
  total: number;
  status: string;
}

// ─── Chunking (paste path) ──────────────────────────────────────────────────

const CHUNK_SIZE = 3200;

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Count session boundary lines
  const boundaryRe =
    /^(interview|candidate[:\s]|company[:\s]|round[:\s]|date[:\s]|name[:\s])/i;
  const lines = normalized.split("\n");
  const boundaryCount = lines.filter(l => boundaryRe.test(l.trim()) && l.trim().length > 0).length;

  const chunks: string[] = [];

  if (boundaryCount >= 2) {
    // Boundary-based: flush a new chunk on each boundary
    let current = "";
    for (const line of lines) {
      const isBoundary = boundaryRe.test(line.trim()) && line.trim().length > 0;
      if (isBoundary && current.length > 200) {
        flushSegment(current.trim(), chunks);
        current = "";
      }
      current += line + "\n";
    }
    if (current.trim()) flushSegment(current.trim(), chunks);
  } else {
    // Paragraph-based
    const paragraphs = normalized.split(/\n\n+/);
    let current = "";
    for (const para of paragraphs) {
      if (current.length + para.length + 2 > CHUNK_SIZE && current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      current += para + "\n\n";
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function flushSegment(segment: string, out: string[]) {
  if (segment.length <= CHUNK_SIZE) {
    out.push(segment);
    return;
  }
  let start = 0;
  while (start < segment.length) {
    let end = Math.min(start + CHUNK_SIZE, segment.length);
    if (end < segment.length) {
      const lastNl = segment.lastIndexOf("\n", end);
      if (lastNl > start + 400) end = lastNl;
    }
    out.push(segment.substring(start, end).trim());
    if (end >= segment.length) break;
    start = Math.max(end - 150, start + 1);
  }
}

// ─── Map raw API session to frontend shape ───────────────────────────────────

function mapSession(s: Record<string, unknown>): ParsedSession {
  return {
    candidateName: (s.candidateName as string) || "Unknown",
    companyName: (s.company as string) || (s.companyName as string) || "Unknown",
    round: (s.round as string) || "L1",
    date: (s.date as string) || "",
    interviewerName: (s.interviewer as string) || (s.interviewerName as string) || "",
    candidateId: null,
    questions: ((s.questions as Record<string, unknown>[]) || []).map(q => ({
      existingQuestionId: null,
      linkToExisting: false,
      existingMatch: q.existingMatch
        ? {
            id: (q.existingMatch as Record<string, unknown>).id as string,
            text: (q.existingMatch as Record<string, unknown>).text as string,
            similarity: (q.existingMatch as Record<string, unknown>).similarity as number,
            askedAt: ((q.existingMatch as Record<string, unknown>).askedAt as string[]) || [],
          }
        : null,
      text: (q.text as string) || "",
      category: (q.category as string) || "General",
      tags: (q.suggestedTags as string[]) || (q.tags as string[]) || [],
    })),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuestionBankQuestionsClient() {
  const [step, setStep] = useState<Step>("INPUT");
  const [inputMode, setInputMode] = useState<InputMode>("PASTE");

  // Paste mode
  const [rawText, setRawText] = useState("");

  // Upload mode
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared processing
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Review
  const [sessions, setSessions] = useState<ParsedSession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [collapsedSessions, setCollapsedSessions] = useState<Set<number>>(new Set());

  // Success
  const [commitResult, setCommitResult] = useState<{
    savedQuestions: number; linkedQuestions: number;
    newSessions: number; newTags: number;
  } | null>(null);

  // Dropdown data
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [users,      setUsers]      = useState<UserProfile[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/questionbank/categories").then(r => r.json()),
      fetch("/api/questionbank/companies").then(r => r.json()),
      fetch("/api/questionbank/admin/users").then(r => r.json()),
    ]).then(([catData, compData, userData]) => {
      if (catData.success) setCategories(catData.data);
      if (compData.success) setCompanies(compData.data);
      if (userData.success) setUsers(userData.data);
    }).catch(console.error);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const loadSessions = useCallback((raw: Record<string, unknown>[]) => {
    const mapped = raw.map(mapSession);
    setSessions(mapped);
    setSelectedSessions(new Set(mapped.map((_, i) => i)));
    setCollapsedSessions(new Set());
    setStep("PREVIEW");
  }, []);

  const totalQuestions = sessions.reduce((a, s) => a + s.questions.length, 0);
  const selectedCount  = selectedSessions.size;

  // ── Parse via paste + client-side chunking ─────────────────────────────────

  const handlePaste = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");

    const chunks = chunkText(rawText.trim());
    const allSessions: Record<string, unknown>[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        setProgress({ current: i + 1, total: chunks.length, status: `Parsing chunk ${i + 1} of ${chunks.length}…` });

        const res  = await fetch("/api/questionbank/digest/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: chunks[i] }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Parse failed");

        const chunkSessions = (data.data?.sessions || []) as Record<string, unknown>[];
        allSessions.push(...chunkSessions);
      }

      if (allSessions.length === 0) throw new Error("No sessions parsed from the text.");
      loadSessions(allSessions);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Parse failed.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // ── Parse via .docx upload (backend handles everything) ───────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    setProgress({ current: 0, total: 1, status: "Extracting text from document…" });

    try {
      // Step 1: extract raw text from docx (fast, no AI)
      const form = new FormData();
      form.append("file", selectedFile);

      const extractRes = await fetch("/api/questionbank/digest/extract", {
        method: "POST",
        body: form,
      });
      const extractData = await extractRes.json();

      if (!extractData.success) throw new Error(extractData.message || "Text extraction failed");

      const rawText: string = extractData.data?.text ?? "";
      if (!rawText.trim()) throw new Error("No text could be extracted from the document.");

      // Step 2: chunk + parse with progress (same flow as paste mode)
      const chunks = chunkText(rawText);
      const allSessions: Record<string, unknown>[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setProgress({
          current: i + 1,
          total: chunks.length,
          status: `Parsing chunk ${i + 1} of ${chunks.length}…`,
        });

        const res = await fetch("/api/questionbank/digest/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: chunks[i] }),
        });
        const data = await res.json();
        if (!data.success) {
          console.warn(`Chunk ${i + 1} failed:`, data.message);
          continue;
        }

        const chunkSessions = (data.data?.sessions || []) as Record<string, unknown>[];
        allSessions.push(...chunkSessions);
      }

      if (allSessions.length === 0) throw new Error("No sessions found in the document.");
      loadSessions(allSessions);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Upload failed.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // ── Commit ─────────────────────────────────────────────────────────────────

  const handleCommit = async () => {
    const toCommit = sessions.filter((_, i) => selectedSessions.has(i));
    if (!toCommit.length) return;
    setLoading(true);
    setError("");

    try {
      const payload = {
        sessions: toCommit.map(s => ({
          ...s,
          questions: s.questions.map(q => ({
            text: q.text,
            category: q.category,
            tags: q.tags,
            existingQuestionId:
              q.linkToExisting && q.existingMatch?.id ? q.existingMatch.id : null,
          })),
        })),
      };

      const res  = await fetch("/api/questionbank/digest/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Commit failed");
      setCommitResult(data.data);
      setStep("SUCCESS");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Commit failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRawText("");
    setSelectedFile(null);
    setStep("INPUT");
    setSessions([]);
    setSelectedSessions(new Set());
    setCollapsedSessions(new Set());
    setError("");
    setCommitResult(null);
    setProgress(null);
  };

  // ── Session / question mutations ───────────────────────────────────────────

  const updateSessionMeta = (sIdx: number, field: keyof ParsedSession, value: string) =>
    setSessions(prev => prev.map((s, si) => si !== sIdx ? s : { ...s, [field]: value }));

  const updateQuestion = (sIdx: number, qIdx: number, patch: Partial<ParsedQuestion>) =>
    setSessions(prev => prev.map((s, si) => si !== sIdx ? s : {
      ...s,
      questions: s.questions.map((q, qi) => qi !== qIdx ? q : { ...q, ...patch }),
    }));

  const toggleLink = (sIdx: number, qIdx: number, link: boolean) => {
    const q = sessions[sIdx]?.questions[qIdx];
    if (!q?.existingMatch) return;
    updateQuestion(sIdx, qIdx, { linkToExisting: link, existingQuestionId: link ? q.existingMatch.id : null });
  };

  const removeQuestion = (sIdx: number, qIdx: number) =>
    setSessions(prev => prev.map((s, si) => si !== sIdx ? s : {
      ...s, questions: s.questions.filter((_, qi) => qi !== qIdx),
    }));

  const addBlankQuestion = (sIdx: number) =>
    setSessions(prev => prev.map((s, si) => si !== sIdx ? s : {
      ...s,
      questions: [...s.questions, { existingQuestionId: null, linkToExisting: false, existingMatch: null, text: "", category: "", tags: [] }],
    }));

  const toggleSessionCollapse = (sIdx: number) =>
    setCollapsedSessions(prev => {
      const next = new Set(prev);
      next.has(sIdx) ? next.delete(sIdx) : next.add(sIdx);
      return next;
    });

  const toggleSessionSelect = (sIdx: number) =>
    setSelectedSessions(prev => {
      const next = new Set(prev);
      next.has(sIdx) ? next.delete(sIdx) : next.add(sIdx);
      return next;
    });

  const toggleAllSessions = () =>
    setSelectedSessions(prev =>
      prev.size === sessions.length ? new Set() : new Set(sessions.map((_, i) => i))
    );

  // ── Company helpers ────────────────────────────────────────────────────────

  const getCompanyValue = (name: string | undefined) => {
    if (!name) return "";
    const trimmed = name.trim();
    const matched = companies.find(c => c.name.trim().toLowerCase() === trimmed.toLowerCase());
    return matched ? matched.name : (trimmed ? "NEW" : "");
  };

  const handleCompanyChange = (sIdx: number, value: string) => {
    if (value !== "NEW") updateSessionMeta(sIdx, "companyName", value);
  };

  // ── Loading overlay ────────────────────────────────────────────────────────

  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-[var(--surface)]/90 backdrop-blur-xs flex flex-col items-center justify-center gap-4 rounded-2xl z-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/10 text-purple-600 border border-purple-500/20 shadow-inner">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-extrabold text-[var(--text-primary)] tracking-wide">
          {progress?.status ?? "PROCESSING DATA ENGINE…"}
        </p>
        <p className="text-xs font-semibold text-[var(--text-secondary)]">
          Parsing raw interview transcripts via AI engine
        </p>
      </div>
      {progress && progress.total > 1 && (
        <div className="w-72 space-y-1.5 mt-2">
          <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)]">
            <span>Chunk {progress.current} of {progress.total}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300 shadow-2xs"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              AI Data Engine
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Digest Data Ingestion
            </h1>
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
            Feed raw interview strings or upload .docx files to extract, tag, and organize question bank sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            step === "INPUT" ? "bg-purple-600 text-white shadow-2xs" : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)]"
          }`}>
            1. Input Source
          </span>
          <span className="text-[var(--text-secondary)]">→</span>
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            step === "PREVIEW" ? "bg-purple-600 text-white shadow-2xs" : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)]"
          }`}>
            2. Review & Edit
          </span>
          <span className="text-[var(--text-secondary)]">→</span>
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            step === "SUCCESS" ? "bg-emerald-600 text-white shadow-2xs" : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)]"
          }`}>
            3. Ingested
          </span>
        </div>
      </div>

      {/* ── STEP 1: INPUT ─────────────────────────────────────────────────── */}
      {step === "INPUT" && (
        <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Interview Transcript Ingestion
            </h3>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Multi-session parser & deduplication
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Mode Selector Tabs */}
            <div className="inline-flex gap-1.5 p-1.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-2xl">
              <button
                type="button"
                onClick={() => setInputMode("PASTE")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  inputMode === "PASTE"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-purple-500/10"
                }`}
              >
                <FileText className="h-4 w-4" />
                Paste Raw Text
              </button>
              <button
                type="button"
                onClick={() => setInputMode("UPLOAD")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  inputMode === "UPLOAD"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-purple-500/10"
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload Document (.docx)
              </button>
            </div>

            {/* ── Paste tab ── */}
            {inputMode === "PASTE" && (
              <div className="relative space-y-2">
                <Textarea
                  className="h-96 font-mono text-xs rounded-2xl border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 leading-relaxed"
                  placeholder={`[ PASTE RAW INTERVIEW TEXT HERE... ]\n\nSupports any format — the AI engine will automatically extract candidate sessions, questions, tags and categories.\nFor large transcript archives (500+ questions), use the Upload .docx tab instead.`}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  disabled={loading}
                />
                {loading && <LoadingOverlay />}
                {rawText.length > 0 && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-mono bg-[var(--surface)]/90 backdrop-blur-xs px-3 py-1 rounded-xl border border-[var(--border)] shadow-2xs">
                    <span>{rawText.length.toLocaleString()} characters</span>
                    {rawText.length > CHUNK_SIZE && (
                      <span className="text-purple-600 font-bold">
                        · {chunkText(rawText.trim()).length} AI chunks
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Upload tab ── */}
            {inputMode === "UPLOAD" && (
              <div className="space-y-3 relative">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f?.name.endsWith(".docx")) setSelectedFile(f);
                    else setError("Only .docx files are supported.");
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-purple-500 bg-purple-500/10 shadow-xs"
                      : "border-[var(--border)] hover:border-purple-500/50 hover:bg-purple-500/5"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setSelectedFile(f);
                    }}
                  />
                  {selectedFile ? (
                    <div className="space-y-3">
                      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        <FileText className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-[var(--text-primary)]">{selectedFile.name}</p>
                        <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB document ready for AI extraction
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" /> Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        <Upload className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-[var(--text-primary)]">Drop your Word document (.docx) here</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">or click to browse your file system</p>
                      </div>
                      <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                        Supports bulk document ingestion (500+ questions)
                      </span>
                    </div>
                  )}
                </div>
                {loading && <LoadingOverlay />}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <p className="flex-1">{error}</p>
                <button type="button" onClick={() => setError("")} className="p-1 hover:bg-rose-500/20 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end border-t border-[var(--border)] pt-5">
              {inputMode === "PASTE" ? (
                <Button
                  onClick={handlePaste}
                  disabled={loading || !rawText.trim()}
                  className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer px-6"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Parse & Preview Transcripts
                </Button>
              ) : (
                <Button
                  onClick={handleUpload}
                  disabled={loading || !selectedFile}
                  className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer px-6"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload & Extract Document
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: PREVIEW ───────────────────────────────────────────────── */}
      {step === "PREVIEW" && (
        <div className="space-y-6">
          {/* Top Bar Header */}
          <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs p-5 flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                  Review Extracted Sessions
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  {sessions.length} session(s)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                  {totalQuestions} question(s)
                </span>
              </div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                Edit session metadata, assign candidates, or link duplicate questions before final ingestion.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("INPUT")}
                className="rounded-xl font-semibold border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-xs cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Input
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllSessions}
                className="rounded-xl font-semibold border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-xs cursor-pointer"
              >
                {selectedCount === sessions.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-5">
            {sessions.map((session, sIdx) => {
              const isSelected  = selectedSessions.has(sIdx);
              const isCollapsed = collapsedSessions.has(sIdx);

              return (
                <div
                  key={sIdx}
                  className={`panel-card rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? "border-purple-500/30 bg-[var(--surface)] shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface-subtle)]/40 opacity-60 border-dashed"
                  }`}
                >
                  {/* Session Header */}
                  <div className="panel-header panel-header-accent-indigo flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSessionSelect(sIdx)}
                        className="h-4 w-4 rounded border-[var(--border)] text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-[var(--text-primary)]">
                            Session {sIdx + 1}
                          </h4>
                          {session.companyName && session.companyName !== "Unknown" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                              <Building2 className="h-3 w-3" />
                              {session.companyName}
                              {session.round && ` · ${session.round}`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
                          Candidate: {session.candidateName || "Unassigned"}
                          {session.date && ` · Date: ${session.date}`}
                          {" · "}{session.questions.length} question(s)
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSessionCollapse(sIdx)}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-purple-500/10 text-[var(--text-secondary)] cursor-pointer"
                    >
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </div>

                  {!isCollapsed && (
                    <div className="p-5 space-y-6">
                      {/* Session Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-5 border-b border-[var(--border)]">
                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                            Link System User
                          </label>
                          <Select
                            value={session.candidateId || ""}
                            onValueChange={v => {
                              updateSessionMeta(sIdx, "candidateId", v);
                              if (v) {
                                const u = users.find(u => u.id === v);
                                if (u) updateSessionMeta(sIdx, "candidateName", u.name);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-semibold">
                              <SelectValue placeholder="— No Link —" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[var(--border)]">
                              <SelectItem value="">— No Link —</SelectItem>
                              {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                            Candidate Name
                          </label>
                          <Input
                            value={session.candidateName || ""}
                            onChange={e => updateSessionMeta(sIdx, "candidateName", e.target.value)}
                            className="h-8 text-xs font-semibold rounded-xl border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                            Company Target
                          </label>
                          <Select value={getCompanyValue(session.companyName)} onValueChange={v => handleCompanyChange(sIdx, v)}>
                            <SelectTrigger className="h-8 text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-semibold">
                              <SelectValue placeholder="— Select —" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[var(--border)]">
                              {companies.map(c => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                              <SelectItem value="NEW">+ Add New…</SelectItem>
                            </SelectContent>
                          </Select>
                          {getCompanyValue(session.companyName) === "NEW" && (
                            <Input
                              placeholder="New company name…"
                              value={session.companyName}
                              onChange={e => updateSessionMeta(sIdx, "companyName", e.target.value)}
                              className="mt-1 h-8 text-xs font-semibold rounded-xl border-[var(--border)] bg-[var(--surface)]"
                            />
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                            Interview Round
                          </label>
                          <Input
                            value={session.round || ""}
                            onChange={e => updateSessionMeta(sIdx, "round", e.target.value)}
                            className="h-8 text-xs font-semibold rounded-xl border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                            Session Date
                          </label>
                          <Input
                            type="date"
                            value={session.date || ""}
                            onChange={e => updateSessionMeta(sIdx, "date", e.target.value)}
                            className="h-8 text-xs font-semibold rounded-xl border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                            Interviewer
                          </label>
                          <Input
                            value={session.interviewerName || ""}
                            onChange={e => updateSessionMeta(sIdx, "interviewerName", e.target.value)}
                            className="h-8 text-xs font-semibold rounded-xl border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                      </div>

                      {/* Questions Directory */}
                      <div className="space-y-3">
                        {session.questions.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-[var(--border)] rounded-2xl">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">
                              No questions in this session — click below to add one.
                            </p>
                          </div>
                        )}

                        {session.questions.map((q, qIdx) => (
                          <div key={qIdx} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/40 p-4 space-y-3 shadow-2xs">
                            <div className="flex justify-between items-center border-b border-[var(--border)]/60 pb-2">
                              <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                                Question #{qIdx + 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(sIdx, qIdx)}
                                className="h-6 px-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                              >
                                Remove Question
                              </Button>
                            </div>

                            <Textarea
                              value={q.text}
                              onChange={e => updateQuestion(sIdx, qIdx, { text: e.target.value, linkToExisting: false, existingQuestionId: null })}
                              rows={2}
                              className="text-xs font-medium rounded-xl border-[var(--border)] bg-[var(--surface)] leading-relaxed"
                            />

                            {q.existingMatch && (
                              <div className={`rounded-xl border p-3.5 text-xs ${
                                q.linkToExisting
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                              }`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-amber-600 dark:text-amber-300 text-xs flex items-center gap-1.5">
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      Potential duplicate ({Math.round(q.existingMatch.similarity * 100)}% match)
                                    </p>
                                    <p className="mt-1 italic text-[11px] text-[var(--text-secondary)] truncate">
                                      &ldquo;{q.existingMatch.text}&rdquo;
                                    </p>
                                    {q.existingMatch.askedAt.length > 0 && (
                                      <p className="mt-1 text-[10px] font-mono text-[var(--text-secondary)]">
                                        Asked at: {q.existingMatch.askedAt.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      variant={q.linkToExisting ? "default" : "outline"}
                                      onClick={() => toggleLink(sIdx, qIdx, true)}
                                      className={`h-7 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                                        q.linkToExisting ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                                      }`}
                                    >
                                      Link Existing
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={!q.linkToExisting ? "default" : "outline"}
                                      onClick={() => toggleLink(sIdx, qIdx, false)}
                                      className="h-7 px-2.5 rounded-lg text-xs font-bold cursor-pointer"
                                    >
                                      Save as New
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                                  Classification Category
                                </label>
                                <Select
                                  value={categories.some(c => c.name === q.category) ? q.category : ""}
                                  onValueChange={v => updateQuestion(sIdx, qIdx, { category: v })}
                                >
                                  <SelectTrigger className="h-8 text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] font-semibold">
                                    <SelectValue placeholder="Select Category…" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-[var(--border)]">
                                    {categories.map(c => (
                                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">
                                  Tags (comma separated)
                                </label>
                                <Input
                                  value={(q.tags || []).join(", ")}
                                  onChange={e => updateQuestion(sIdx, qIdx, {
                                    tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean),
                                  })}
                                  placeholder="e.g., system-design, concurrency"
                                  className="h-8 font-mono text-xs rounded-xl border-[var(--border)] bg-[var(--surface)]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBlankQuestion(sIdx)}
                          className="w-full rounded-xl border-dashed border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold text-xs cursor-pointer py-2"
                        >
                          <Plus className="h-4 w-4 mr-1.5" /> Add Question to Session
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="flex-1">{error}</p>
            </div>
          )}

          {/* Sticky Floating Commit Bar */}
          <div className="sticky bottom-4 flex justify-between items-center p-4 bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-xl z-30">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Selected: <span className="font-extrabold text-[var(--text-primary)]">{selectedCount}</span> of {sessions.length} sessions
              {selectedCount > 0 && (
                <span className="ml-2 text-purple-600 font-bold">
                  · {sessions.filter((_, i) => selectedSessions.has(i)).reduce((a, s) => a + s.questions.length, 0)} questions ready
                </span>
              )}
            </p>
            <Button
              onClick={handleCommit}
              disabled={loading || selectedCount === 0}
              className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer px-6"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save & Ingest Selected Sessions
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUCCESS ───────────────────────────────────────────────── */}
      {step === "SUCCESS" && commitResult && (
        <div className="panel-card rounded-2xl border border-emerald-500/30 bg-[var(--surface)] p-8 text-center shadow-xs space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-extrabold text-sm">
            <CheckCircle2 className="h-5 w-5" />
            Batch Ingestion Completed Successfully
          </div>

          <div className="max-w-md mx-auto grid grid-cols-2 gap-4 text-left pt-2">
            {[
              { label: "New Questions Saved", value: commitResult.savedQuestions, icon: FileText, color: "text-purple-600 dark:text-purple-400" },
              { label: "Existing Linked", value: commitResult.linkedQuestions, icon: Sparkles, color: "text-amber-600 dark:text-amber-400" },
              { label: "Sessions Created", value: commitResult.newSessions, icon: Building2, color: "text-indigo-600 dark:text-indigo-400" },
              { label: "New Tags Generated", value: commitResult.newTags, icon: Hash, color: "text-teal-600 dark:text-teal-400" },
            ].map(({ label, value, icon: IconComponent, color }) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{label}</span>
                  <IconComponent className={`h-4 w-4 ${color}`} />
                </div>
                <p className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              onClick={handleReset}
              className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs cursor-pointer px-5"
            >
              Ingest More Transcripts
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/admin/questionbank/manage"}
              className="rounded-xl font-bold border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] cursor-pointer px-5"
            >
              View Question Bank Directory
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
