"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, RotateCcw, Sparkles, Code2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import { ProblemPanel, ProblemPanelSkeleton } from "./ProblemPanel";
import type { StructuredProblem } from "@/app/api/code/problem/route";
import {
  LANGUAGES,
  type AiReview,
  type CodeSubmission,
  type CodeSubmissionRecord,
  type QuestionMeta,
  type RunResult,
  type TestCase,
  resolveStarterCode,
} from "./codingTypes";

interface LangInfo { id: string; label: string; available: boolean; }

interface Props {
  questionMeta: QuestionMeta;
  codingEnabled?: boolean;
  onSubmissionChange?: (sub: CodeSubmissionRecord) => void;
  onSubmitAsAnswer?: (answer: string) => void;
  codingSecondsLeft?: number | null;
  codingTimerActive?: boolean;
  interviewId?: string;
}

export type { CodeSubmission, CodeSubmissionRecord, QuestionMeta };

function formatCodingTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Left-pane test case card ────────────────────────────────────────────────

function TestCaseCard({ tc, result }: { tc: TestCase; result?: RunResult }) {
  const [open, setOpen] = useState(false);

  const statusIcon = result
    ? result.passed
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      : result.timed_out
        ? <Clock className="h-4 w-4 text-amber-500 shrink-0" />
        : <XCircle className="h-4 w-4 text-red-500 shrink-0" />
    : null;

  const borderCls = result
    ? result.passed
      ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/10"
      : "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/10"
    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900";

  return (
    <div className={`rounded-lg border text-xs overflow-hidden ${borderCls}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {statusIcon}
          <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{tc.name}</span>
        </div>
        {result && (
          <span className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
            result.passed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          }`}>
            {result.passed ? "Pass" : result.timed_out ? "TLE" : "Fail"}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 pb-3 pt-2 space-y-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">Input</div>
            <pre className="font-mono whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-zinc-700 dark:text-zinc-300">
              {tc.input || "(empty)"}
            </pre>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">Expected</div>
            <pre className="font-mono whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-zinc-700 dark:text-zinc-300">
              {tc.expected || "(not specified)"}
            </pre>
          </div>
          {result && !result.passed && (
            <>
              {result.error_type === "execution_unavailable" ? (
                <div className="rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-2 py-1.5 text-amber-800 dark:text-amber-300">
                  Code execution temporarily unavailable.
                </div>
              ) : (
                <>
                  {result.friendly_error && (
                    <div className={`rounded px-2 py-1.5 border ${
                      result.error_type === "compile_error"
                        ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300"
                        : result.error_type === "timeout"
                          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                    }`}>
                      <span className="font-semibold capitalize">{(result.error_type ?? "error").replace("_", " ")}: </span>
                      {result.friendly_error}
                    </div>
                  )}
                  {result.error_type === "output_mismatch" && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-red-500 dark:text-red-400 mb-1">Your output</div>
                      <pre className="font-mono whitespace-pre-wrap bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 text-red-800 dark:text-red-200 max-h-24 overflow-auto">
                        {result.actual || result.stdout || "(no output)"}
                      </pre>
                    </div>
                  )}
                  {result.error_type !== "output_mismatch" && result.stderr && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-red-500 dark:text-red-400 mb-1">
                        {result.error_type === "compile_error" ? "Compiler output" : "Error details"}
                      </div>
                      <pre className="font-mono whitespace-pre-wrap bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 text-red-700 dark:text-red-300 max-h-28 overflow-auto">
                        {result.stderr}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

const LEFT_MIN = 240;
const LEFT_MAX = 520;
const LEFT_DEFAULT = 320;

export function CodeWorkspace({
  questionMeta,
  codingEnabled = false,
  onSubmissionChange,
  onSubmitAsAnswer,
  codingSecondsLeft = null,
  codingTimerActive = false,
  interviewId,
}: Props) {
  const { question, slot, preferredLanguage, starterCode } = questionMeta;
  const showWorkspace = codingEnabled;

  // ── State ──────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(preferredLanguage || "python");
  const [code, setCode] = useState(() => resolveStarterCode(preferredLanguage || "python", starterCode));
  const [stdin, setStdin] = useState("");
  const [complexity, setComplexity] = useState("");

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [generatingTests, setGeneratingTests] = useState(false);

  const [structuredProblem, setStructuredProblem] = useState<StructuredProblem | null>(null);
  const [problemLoading, setProblemLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<RunResult[] | null>(null);
  const [runScore, setRunScore] = useState<number | null>(null); // 0-100
  const [runError, setRunError] = useState<string | null>(null);

  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiReview, setShowAiReview] = useState(false);

  const [availableLangs, setAvailableLangs] = useState<LangInfo[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Split-pane width state
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT);
  const isDraggingSplit = useRef(false);
  const splitDragStartX = useRef(0);
  const splitDragStartW = useRef(LEFT_DEFAULT);

  const lastSlotRef = useRef<number>(-1);
  // Track whether the code has been modified by the candidate
  const codeIsPristineRef = useRef(true);

  const draftKey = interviewId ? `br_code_draft_${interviewId}_${slot}` : null;

  // ── Language availability ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/code")
      .then((r) => r.json())
      .then((d: { languages?: LangInfo[] }) => { if (d.languages) setAvailableLangs(d.languages); })
      .catch(() => {});
  }, []);

  // ── Fetch structured problem ───────────────────────────────────────────
  const fetchStructuredProblem = useCallback(async (q: string, language: string) => {
    if (!q || q.trim().length < 20) return;
    setProblemLoading(true);
    try {
      const res = await fetch("/api/code/problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, language }),
      });
      if (!res.ok) return;
      const data = await res.json() as { problem?: StructuredProblem };
      if (data.problem) {
        setStructuredProblem(data.problem);
        // Apply starter code only if candidate hasn't typed anything yet
        if (codeIsPristineRef.current) {
          const aiStarter = data.problem.starterCode[language] ?? data.problem.starterCode["python"];
          if (aiStarter?.trim()) {
            setCode(aiStarter);
          }
        }
      }
    } catch {
      // silently fail — editor still works
    } finally {
      setProblemLoading(false);
    }
  }, []);

  // ── Fetch test cases ────────────────────────────────────────────────────
  const generateTestCases = useCallback(async (q: string, language: string) => {
    if (!q || generatingTests) return;
    setGeneratingTests(true);
    try {
      const res = await fetch("/api/code/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, language }),
      });
      const data = await res.json() as { testCases?: TestCase[] };
      setTestCases(data.testCases ?? []);
    } catch {
      // ignore
    } finally {
      setGeneratingTests(false);
    }
  }, [generatingTests]);

  // ── Reset on new slot ─────────────────────────────────────────────────
  useEffect(() => {
    if (slot === lastSlotRef.current) return;
    lastSlotRef.current = slot;
    const nextLang = preferredLanguage || "python";

    // Restore draft from localStorage if one exists for this slot
    let restoredCode: string | null = null;
    let restoredLang: string | null = null;
    if (draftKey) {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved) as { code: string; lang: string };
          if (parsed.code?.trim()) {
            restoredCode = parsed.code;
            restoredLang = parsed.lang;
          }
        }
      } catch { /* ignore */ }
    }

    const activeLang = restoredLang ?? nextLang;
    const defaultCode = restoredCode ?? resolveStarterCode(nextLang, starterCode);
    setLang(activeLang);
    setCode(defaultCode);
    codeIsPristineRef.current = restoredCode == null;
    setStdin("");
    setComplexity("");
    setTestCases([]);
    setResults(null);
    setRunScore(null);
    setAiReview(null);
    setRunError(null);
    setStatusMsg(null);
    setStructuredProblem(null);
    setShowAiReview(false);

    if (showWorkspace && question.trim().length > 20) {
      void fetchStructuredProblem(question, activeLang);
      void generateTestCases(question, activeLang);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  // ── Persist code draft to localStorage (debounced 1 s) ───────────────
  useEffect(() => {
    if (!draftKey || codeIsPristineRef.current) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify({ code, lang })); } catch { /* ignore */ }
    }, 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang, draftKey]);

  // ── Lang change ────────────────────────────────────────────────────────
  const handleLangChange = useCallback((newLang: string) => {
    setLang(newLang);
    // Apply AI starter for new language if pristine
    const aiStarter = structuredProblem?.starterCode[newLang] ?? structuredProblem?.starterCode["python"];
    if (codeIsPristineRef.current && aiStarter?.trim()) {
      setCode(aiStarter);
    } else if (codeIsPristineRef.current) {
      setCode(resolveStarterCode(newLang, null));
    }
    setResults(null);
    setAiReview(null);
    setRunError(null);
  }, [structuredProblem]);

  // ── Code execution ─────────────────────────────────────────────────────
  const executeCode = useCallback(async (): Promise<RunResult[] | null> => {
    const cases = testCases.filter((tc) => tc.input.trim() || tc.expected.trim());
    const res = await fetch("/api/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: lang,
        code,
        stdin,
        timeout_ms: 15000,
        test_cases: cases.length > 0
          ? cases.map((tc) => ({ name: tc.name, input: tc.input, expected: tc.expected || undefined }))
          : [],
      }),
    });
    const data = await res.json() as { results?: RunResult[]; error?: string; score?: number };
    if (!res.ok || data.error) {
      setRunError(data.error ?? "Execution failed");
      return null;
    }
    const runResults = data.results ?? [];
    setResults(runResults);
    setRunScore(data.score ?? null);
    setRunError(null);
    return runResults;
  }, [lang, code, stdin, testCases]);

  // ── AI review ─────────────────────────────────────────────────────────
  const runAiReview = useCallback(async (runResults: RunResult[] | null) => {
    setAiLoading(true);
    setShowAiReview(true);
    try {
      const res = await fetch("/api/ai/analyze-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: lang,
          question: question ?? "",
          stdout: runResults?.[0]?.stdout ?? "",
          stderr: runResults?.[0]?.stderr ?? "",
          passed: runResults?.every((r) => r.passed) ?? false,
          testSummary: runResults?.length
            ? `${runResults.filter((r) => r.passed).length}/${runResults.length} test cases passed`
            : undefined,
          failureReasons: runResults
            ?.filter((r) => !r.passed && r.friendly_error)
            .map((r) => `${r.name}: ${r.friendly_error}`)
            .join("; ") || undefined,
        }),
      });
      const data = await res.json() as AiReview;
      setAiReview(data);
      return data;
    } catch {
      const fallback: AiReview = {
        correctness: "unknown", timeComplexity: "unknown", spaceComplexity: "unknown",
        score: 0, bugs: [], improvements: [], overallFeedback: "AI review unavailable.",
      };
      setAiReview(fallback);
      return fallback;
    } finally {
      setAiLoading(false);
    }
  }, [code, lang, question]);

  // ── Build answer text ──────────────────────────────────────────────────
  const buildAnswerText = useCallback((runResults: RunResult[] | null, review: AiReview | null) => {
    const resultSummary = runResults?.length
      ? `\n\nTest results: ${runResults.map((r) => {
          if (r.passed) return `${r.name}: PASSED`;
          const expected = r.expected ?? "(not specified)";
          const actual = r.actual ?? r.stdout ?? r.stderr ?? "(no output)";
          return `${r.name}: FAILED — expected: ${expected.slice(0, 120)}; actual: ${actual.slice(0, 120)}`;
        }).join("; ")}`
      : "";
    const complexityNote = complexity ? `\n\nTime/Space complexity: ${complexity}` : "";
    const reviewNote = review
      ? `\n\nAI review: score ${review.score}/5, correctness ${review.correctness}. ${review.overallFeedback}`
      : "";
    return `[Code submission — ${lang}]\n\`\`\`${lang}\n${code}\n\`\`\`${resultSummary}${complexityNote}${reviewNote}`;
  }, [lang, code, complexity]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    setRunning(true);
    setRunError(null);
    setResults(null);
    setStatusMsg(null);
    try { await executeCode(); }
    catch (e) { setRunError(String(e)); }
    finally { setRunning(false); }
  }, [executeCode]);

  const handleRunAndSubmit = useCallback(async () => {
    if (!onSubmitAsAnswer || !code.trim()) return;
    if (codingTimerActive && codingSecondsLeft !== null && codingSecondsLeft <= 0) return;
    setSubmitting(true);
    setStatusMsg("Running tests…");
    try {
      const runResults = await executeCode();
      setStatusMsg("Running AI review…");
      const review = await runAiReview(runResults);
      const answer = buildAnswerText(runResults, review);
      onSubmissionChange?.({
        slot, question, submittedAt: new Date().toISOString(),
        language: lang, code, results: runResults, aiReview: review, complexity,
      });
      setStatusMsg("Submitting…");
      if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
      onSubmitAsAnswer(answer);
      setStatusMsg("Submitted ✓");
    } catch (e) {
      setRunError(String(e));
      setStatusMsg(null);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmitAsAnswer, onSubmissionChange, slot, question, lang, complexity, code, executeCode, runAiReview, buildAnswerText, codingTimerActive, codingSecondsLeft]);

  // ── Split-pane drag ────────────────────────────────────────────────────
  const onSplitMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingSplit.current = true;
    splitDragStartX.current = e.clientX;
    splitDragStartW.current = leftWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingSplit.current) return;
      const delta = ev.clientX - splitDragStartX.current;
      setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, splitDragStartW.current + delta)));
    };
    const onUp = () => {
      isDraggingSplit.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [leftWidth]);

  // ── Derived ────────────────────────────────────────────────────────────
  if (!showWorkspace) return null;

  const passedCount = results?.filter((r) => r.passed).length ?? 0;
  const failedCount = results?.filter((r) => !r.passed).length ?? 0;
  const allPassed = results !== null && results.length > 0 && failedCount === 0;
  const busy = running || submitting || aiLoading;
  const resultByName = new Map(results?.map((r) => [r.name, r]) ?? []);

  const isAvailable = (id: string) =>
    availableLangs.length === 0 || availableLangs.find((l) => l.id === id)?.available !== false;

  return (
    <div className="flex flex-col rounded-xl border border-blue-200 bg-white dark:border-blue-900/50 dark:bg-zinc-950 overflow-hidden ring-1 ring-blue-100 dark:ring-blue-950">

      {/* ── Full-width header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">Coding Question</span>
          <span className="text-xs text-blue-600/70 dark:text-blue-400/70">· Slot {slot}</span>
          {codingTimerActive && codingSecondsLeft != null && (
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
              codingSecondsLeft < 120
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
            }`}>
              ⏱ {formatCodingTime(codingSecondsLeft)}
            </span>
          )}
          {results !== null && results.length > 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              allPassed
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : passedCount > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}>
              {allPassed
                ? `✓ All ${passedCount} passed`
                : `${passedCount}/${results.length} passed${runScore !== null ? ` · ${runScore}%` : ""}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}{!isAvailable(l.id) ? " (limited)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const aiStarter = structuredProblem?.starterCode[lang] ?? structuredProblem?.starterCode["python"];
              setCode(aiStarter?.trim() ? aiStarter : resolveStarterCode(lang, starterCode));
              codeIsPristineRef.current = true;
              setResults(null);
              setAiReview(null);
              setRunError(null);
            }}
            title="Reset to starter code"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Split pane body ──────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* LEFT PANE — problem + test cases */}
        <div
          className="flex flex-col overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 shrink-0"
          style={{ width: leftWidth, minWidth: LEFT_MIN, maxWidth: LEFT_MAX }}
        >
          {/* Problem panel */}
          {problemLoading && <ProblemPanelSkeleton />}
          {!problemLoading && structuredProblem && (
            <ProblemPanel problem={structuredProblem} language={lang} />
          )}
          {!problemLoading && !structuredProblem && (
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{question}</p>
            </div>
          )}

          {/* Test cases */}
          <div className="flex-1 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Test Cases
                {results !== null && testCases.length > 0 && (
                  <span className="ml-1.5 font-semibold text-zinc-400">
                    ({passedCount}/{testCases.length} passed)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => { void generateTestCases(question, lang); }}
                disabled={generatingTests || !question.trim()}
                className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline disabled:opacity-50"
              >
                <Sparkles className="h-2.5 w-2.5" />
                {generatingTests ? "Generating…" : testCases.length > 0 ? "Regenerate" : "Generate"}
              </button>
            </div>

            {generatingTests && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating test cases…
              </div>
            )}

            {!generatingTests && testCases.length === 0 && (
              <p className="text-xs text-zinc-400 py-2">
                Test cases will generate automatically. Click Generate if they don&apos;t appear.
              </p>
            )}

            {testCases.map((tc) => (
              <TestCaseCard key={tc.id} tc={tc} result={resultByName.get(tc.name)} />
            ))}

            {/* Custom stdin */}
            <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Custom stdin</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Optional — type custom input here"
                rows={3}
                className="w-full text-xs font-mono bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* DRAG HANDLE */}
        <div
          onMouseDown={onSplitMouseDown}
          title="Drag to resize"
          className="w-1.5 cursor-col-resize bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors shrink-0 flex items-center justify-center group"
        >
          <div className="h-8 w-0.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-blue-500" />
        </div>

        {/* RIGHT PANE — editor + output */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Editor */}
          <CodeEditor
            language={lang}
            value={code}
            onChange={(v) => {
              setCode(v);
              // Mark as dirty so AI starter code isn't re-applied on lang change
              if (codeIsPristineRef.current) {
                const defaultCode = resolveStarterCode(lang, starterCode);
                const aiStarter = structuredProblem?.starterCode[lang] ?? structuredProblem?.starterCode["python"] ?? "";
                if (v !== defaultCode && v !== aiStarter) {
                  codeIsPristineRef.current = false;
                }
              }
            }}
            onRun={() => { if (!busy && code.trim()) void handleRun(); }}
          />

          {/* Complexity input */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Time / Space Complexity</label>
            <input
              type="text"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              placeholder="e.g. O(n log n) / O(n)"
              className="mt-1 w-full text-xs bg-transparent border-0 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5">
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={busy || !code.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Running…" : "Run"}
            </button>

            {onSubmitAsAnswer && (
              <button
                type="button"
                disabled={busy || !code.trim() || (codingTimerActive && codingSecondsLeft !== null && codingSecondsLeft <= 0)}
                onClick={() => void handleRunAndSubmit()}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {submitting ? statusMsg ?? "Submitting…" : "Run & Submit"}
              </button>
            )}

            <button
              type="button"
              onClick={() => void runAiReview(results)}
              disabled={busy || !code.trim()}
              className="flex items-center gap-1.5 rounded-lg border border-violet-300 dark:border-violet-700 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300 disabled:opacity-50 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI Review
            </button>

            {!submitting && statusMsg && (
              <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">{statusMsg}</span>
            )}
          </div>

          {/* Run error */}
          {runError && (
            <div className="border-t border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-4 py-2.5">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">Error: </span>
              <span className="text-xs text-red-700 dark:text-red-300">{runError}</span>
            </div>
          )}

          {/* Auto-hint banner after failed run */}
          {results !== null && !allPassed && !running && (() => {
            const mismatches = results.filter((r) => !r.passed && r.error_type === "output_mismatch" && r.friendly_error);
            const execErrors = results.filter((r) => !r.passed && (r.error_type === "compile_error" || r.error_type === "runtime_error") && r.friendly_error);
            const banner = execErrors[0]?.friendly_error ?? mismatches[0]?.friendly_error;
            if (!banner) return null;
            const isExec = !!execErrors[0];
            return (
              <div className={`border-t px-4 py-2.5 flex items-start gap-2 ${
                isExec
                  ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                  : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20"
              }`}>
                <span className="text-sm shrink-0">{isExec ? "⚠" : "💡"}</span>
                <div className="text-xs leading-relaxed">
                  <span className={`font-semibold ${isExec ? "text-orange-700 dark:text-orange-300" : "text-blue-700 dark:text-blue-300"}`}>
                    {isExec ? "Fix needed: " : "Hint: "}
                  </span>
                  <span className={isExec ? "text-orange-800 dark:text-orange-200" : "text-blue-800 dark:text-blue-200"}>
                    {banner}
                  </span>
                  {mismatches.length > 1 && (
                    <span className="ml-1 text-zinc-400">
                      (+{mismatches.length - 1} more — expand test cards to see all)
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* AI Review panel */}
          {(aiReview || aiLoading) && showAiReview && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
              {aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing code…
                </div>
              ) : aiReview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-lg border p-2">
                      <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{aiReview.score}<span className="text-zinc-400 text-sm">/5</span></div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wide mt-0.5">Score</div>
                    </div>
                    <div className="rounded-lg border p-2 flex flex-col items-center justify-center">
                      <div className="font-semibold capitalize text-zinc-700 dark:text-zinc-300">{aiReview.correctness}</div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wide mt-0.5">Correctness</div>
                    </div>
                    <div className="rounded-lg border p-2 flex flex-col items-center justify-center">
                      <div className="font-mono text-zinc-700 dark:text-zinc-300">{aiReview.timeComplexity || "—"}</div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wide mt-0.5">Time</div>
                    </div>
                    <div className="rounded-lg border p-2 flex flex-col items-center justify-center">
                      <div className="font-mono text-zinc-700 dark:text-zinc-300">{aiReview.spaceComplexity || "—"}</div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wide mt-0.5">Space</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 px-3 py-2 text-xs text-violet-800 dark:text-violet-200 leading-relaxed">
                    {aiReview.overallFeedback}
                  </div>
                  {aiReview.bugs?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Issues found</div>
                      <ul className="space-y-0.5">
                        {aiReview.bugs.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                            <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiReview.improvements?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1">Suggestions</div>
                      <ul className="space-y-0.5">
                        {aiReview.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                            <Sparkles className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
