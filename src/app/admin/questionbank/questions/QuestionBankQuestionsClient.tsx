"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight, CheckCircle, Loader2, ArrowLeft, Plus, Upload,
  FileText, X, ChevronDown, ChevronUp, AlertTriangle,
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
    start = end - 150;
    if (start <= 0) start = end;
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
    <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-4 rounded-md z-10">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-primary font-mono text-sm">
        {progress?.status ?? "PROCESSING…"}
      </p>
      {progress && progress.total > 1 && (
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Chunk {progress.current}/{progress.total}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
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
    <div className="space-y-6">

      {/* ── STEP 1: INPUT ─────────────────────────────────────────────────── */}
      {step === "INPUT" && (
        <Card>
          <CardHeader>
            <CardTitle>Data Ingestion Module</CardTitle>
            <p className="text-sm text-muted-foreground">
              Paste raw interview text or upload a Word document. AI will parse, tag, and preview before saving.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Mode tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setInputMode("PASTE")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  inputMode === "PASTE"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => setInputMode("UPLOAD")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  inputMode === "UPLOAD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Upload .docx
              </button>
            </div>

            {/* ── Paste tab ── */}
            {inputMode === "PASTE" && (
              <div className="relative">
                <Textarea
                  className="h-96 font-mono text-sm"
                  placeholder={`[ PASTE RAW INTERVIEW TEXT HERE... ]\n\nSupports any format — the AI will extract sessions, questions, tags and categories.\nFor large documents (500+ questions), use the Upload .docx tab instead.`}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  disabled={loading}
                />
                {loading && <LoadingOverlay />}
                {rawText.length > 0 && (
                  <div className="absolute bottom-3 right-3 text-xs text-muted-foreground font-mono bg-background/80 px-2 py-0.5 rounded">
                    {rawText.length.toLocaleString()} chars
                    {rawText.length > CHUNK_SIZE && (
                      <span className="ml-2 text-amber-500">
                        · {chunkText(rawText.trim()).length} chunks
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
                  className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
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
                    <div className="space-y-2">
                      <FileText className="mx-auto h-10 w-10 text-primary" />
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="font-medium text-foreground">Drop your .docx file here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports documents with 500+ questions — the backend handles chunking automatically
                      </p>
                    </div>
                  )}
                </div>
                {loading && <LoadingOverlay />}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-4 p-4 border border-destructive/30 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1">{error}</p>
                <Button variant="ghost" size="sm" onClick={() => setError("")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
              {inputMode === "PASTE" ? (
                <Button
                  onClick={handlePaste}
                  disabled={loading || !rawText.trim()}
                  size="lg"
                  className="gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  PARSE // PREVIEW
                </Button>
              ) : (
                <Button
                  onClick={handleUpload}
                  disabled={loading || !selectedFile}
                  size="lg"
                  className="gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  UPLOAD // PARSE
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: PREVIEW ───────────────────────────────────────────────── */}
      {step === "PREVIEW" && (
        <div className="space-y-4">

          {/* Header */}
          <div className="flex flex-wrap justify-between items-end gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Review Parsed Data</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {sessions.length} session(s) · {totalQuestions} question(s) — edit before committing
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("INPUT")} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllSessions}
              >
                {selectedCount === sessions.length ? "Deselect all" : "Select all"}
              </Button>
            </div>
          </div>

          {/* Sessions */}
          {sessions.map((session, sIdx) => {
            const isSelected  = selectedSessions.has(sIdx);
            const isCollapsed = collapsedSessions.has(sIdx);

            return (
              <Card
                key={sIdx}
                className={`transition-colors ${isSelected ? "" : "opacity-50 border-dashed"}`}
              >
                {/* Session header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSessionSelect(sIdx)}
                      className="h-4 w-4 rounded border-muted-foreground accent-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold">
                        Session {sIdx + 1}
                        {session.companyName && session.companyName !== "Unknown" && (
                          <span className="ml-2 font-normal text-muted-foreground">
                            — {session.companyName}
                            {session.round && ` · ${session.round}`}
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.candidateName}
                        {session.date && ` · ${session.date}`}
                        {" · "}{session.questions.length} question{session.questions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSessionCollapse(sIdx)}
                      className="shrink-0 h-7 w-7 p-0"
                    >
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>

                {!isCollapsed && (
                  <CardContent className="space-y-6">
                    {/* Session metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pb-4 border-b">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Link User</label>
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
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="— No Link —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— No Link —</SelectItem>
                            {users.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Candidate</label>
                        <Input
                          value={session.candidateName || ""}
                          onChange={e => updateSessionMeta(sIdx, "candidateName", e.target.value)}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Company</label>
                        <Select value={getCompanyValue(session.companyName)} onValueChange={v => handleCompanyChange(sIdx, v)}>
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="— Select —" />
                          </SelectTrigger>
                          <SelectContent>
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
                            className="mt-1 h-8 text-xs"
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Round</label>
                        <Input
                          value={session.round || ""}
                          onChange={e => updateSessionMeta(sIdx, "round", e.target.value)}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Date</label>
                        <Input
                          type="date"
                          value={session.date || ""}
                          onChange={e => updateSessionMeta(sIdx, "date", e.target.value)}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Interviewer</label>
                        <Input
                          value={session.interviewerName || ""}
                          onChange={e => updateSessionMeta(sIdx, "interviewerName", e.target.value)}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-3">
                      {session.questions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                          No questions — add one below
                        </p>
                      )}

                      {session.questions.map((q, qIdx) => (
                        <div key={qIdx} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-mono">Q{qIdx + 1}</span>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => removeQuestion(sIdx, qIdx)}
                              className="text-red-500 hover:text-red-600 h-6 text-xs"
                            >
                              Remove
                            </Button>
                          </div>

                          <Textarea
                            value={q.text}
                            onChange={e => updateQuestion(sIdx, qIdx, { text: e.target.value, linkToExisting: false, existingQuestionId: null })}
                            rows={2}
                          />

                          {q.existingMatch && (
                            <div className={`rounded-md border p-3 text-sm ${
                              q.linkToExisting
                                ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                                : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
                            }`}>
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-amber-800 dark:text-amber-200 text-xs">
                                    Possible duplicate ({Math.round(q.existingMatch.similarity * 100)}% similar)
                                  </p>
                                  <p className="mt-1 text-muted-foreground italic text-xs truncate">
                                    &ldquo;{q.existingMatch.text}&rdquo;
                                  </p>
                                  {q.existingMatch.askedAt.length > 0 && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Asked at: {q.existingMatch.askedAt.join(", ")}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button size="sm" variant={q.linkToExisting ? "default" : "outline"}
                                    onClick={() => toggleLink(sIdx, qIdx, true)} className="h-7 text-xs">
                                    Link existing
                                  </Button>
                                  <Button size="sm" variant={!q.linkToExisting ? "default" : "outline"}
                                    onClick={() => toggleLink(sIdx, qIdx, false)} className="h-7 text-xs">
                                    Save as new
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              value={categories.some(c => c.name === q.category) ? q.category : ""}
                              onValueChange={v => updateQuestion(sIdx, qIdx, { category: v })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Category…" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(c => (
                                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              value={(q.tags || []).join(", ")}
                              onChange={e => updateQuestion(sIdx, qIdx, {
                                tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean),
                              })}
                              placeholder="tags, comma, separated"
                              className="h-8 font-mono text-xs"
                            />
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline" size="sm"
                        onClick={() => addBlankQuestion(sIdx)}
                        className="w-full border-dashed gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-4 w-4" /> Add Question
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-3 border border-destructive/30 bg-destructive/10 rounded-md">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
            </div>
          )}

          {/* Commit bar */}
          <div className="sticky bottom-4 flex justify-between items-center p-4 bg-background/95 backdrop-blur border rounded-xl shadow-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedCount}</span> of {sessions.length} sessions selected
              {selectedCount > 0 && (
                <span className="ml-2">
                  · {sessions.filter((_, i) => selectedSessions.has(i)).reduce((a, s) => a + s.questions.length, 0)} questions
                </span>
              )}
            </p>
            <Button
              onClick={handleCommit}
              disabled={loading || selectedCount === 0}
              size="lg"
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              SAVE &amp; INGEST
              {selectedCount < sessions.length && selectedCount > 0 && (
                <span className="ml-1 text-xs opacity-75">({selectedCount} sessions)</span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUCCESS ───────────────────────────────────────────────── */}
      {step === "SUCCESS" && commitResult && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-md font-mono">
              <CheckCircle className="h-5 w-5" />
              BATCH_COMMITTED
            </div>

            <div className="max-w-sm mx-auto space-y-3">
              {[
                { label: "New questions saved",      value: commitResult.savedQuestions },
                { label: "Existing questions linked", value: commitResult.linkedQuestions },
                { label: "Sessions created",          value: commitResult.newSessions },
                { label: "Tags created",              value: commitResult.newTags },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="text-muted-foreground text-sm">{label}</span>
                  <span className="font-mono font-bold text-primary">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3">
              <Button onClick={handleReset}>INGEST MORE</Button>
              <Button variant="outline" onClick={() => window.location.href = "/admin/questionbank/manage"}>
                VIEW QUESTIONS
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
