"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, RotateCcw, Sparkles, ChevronDown, ChevronUp, Code2 } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import {
  LANGUAGES,
  type AiReview,
  type CodeSubmission,
  type CodeSubmissionRecord,
  type QuestionMeta,
  type RunResult,
  type TestCase,
  isCodingKeywords,
  resolveStarterCode,
} from "./codingTypes";

interface LangInfo { id: string; label: string; available: boolean; }

interface Props {
  questionMeta: QuestionMeta;
  onSubmissionChange?: (sub: CodeSubmissionRecord) => void;
  onSubmitAsAnswer?: (answer: string) => void;
}

export type { CodeSubmission, CodeSubmissionRecord, QuestionMeta };

export function CodeWorkspace({ questionMeta, onSubmissionChange, onSubmitAsAnswer }: Props) {
  const { question, slot, isCoding, preferredLanguage, starterCode } = questionMeta;
  const showWorkspace = isCoding || isCodingKeywords(question);

  const [lang, setLang] = useState(preferredLanguage || "python");
  const [code, setCode] = useState(() => resolveStarterCode(preferredLanguage || "python", starterCode));
  const [stdin, setStdin] = useState("");
  const [complexity, setComplexity] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [generatingTests, setGeneratingTests] = useState(false);
  const [testCaseSource, setTestCaseSource] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<RunResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [availableLangs, setAvailableLangs] = useState<LangInfo[]>([]);
  const [showTestCases, setShowTestCases] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [showAiReview, setShowAiReview] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const lastSlotRef = useRef<number>(-1);

  useEffect(() => {
    fetch("/api/code")
      .then((r) => r.json())
      .then((d: { languages?: LangInfo[] }) => { if (d.languages) setAvailableLangs(d.languages); })
      .catch(() => {});
  }, []);

  // Reset editor when a new coding question slot arrives
  useEffect(() => {
    if (slot === lastSlotRef.current) return;
    lastSlotRef.current = slot;
    const nextLang = preferredLanguage || "python";
    setLang(nextLang);
    setCode(resolveStarterCode(nextLang, starterCode));
    setStdin("");
    setComplexity("");
    setTestCases([]);
    setTestCaseSource(null);
    setResults(null);
    setAiReview(null);
    setRunError(null);
    setStatusMsg(null);
    if (showWorkspace && question.trim().length > 20) {
      void generateTestCases(nextLang);
    }
  }, [slot, preferredLanguage, starterCode, question, showWorkspace]);

  useEffect(() => {
    if (!showWorkspace) return;
    const record: CodeSubmissionRecord = {
      slot,
      question,
      submittedAt: new Date().toISOString(),
      language: lang,
      code,
      results,
      aiReview,
      complexity,
    };
    onSubmissionChange?.(record);
  }, [slot, question, lang, code, results, aiReview, complexity, showWorkspace, onSubmissionChange]);

  const generateTestCases = async (languageOverride?: string) => {
    if (!question || generatingTests) return;
    setGeneratingTests(true);
    try {
      const res = await fetch("/api/code/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language: languageOverride ?? lang }),
      });
      const data = await res.json() as { testCases?: TestCase[]; source?: string };
      const cases = data.testCases ?? [];
      if (cases.length > 0) {
        setTestCases(cases);
        setTestCaseSource(data.source ?? null);
      }
    } catch (err) {
      console.error("Failed to generate test cases:", err);
    } finally {
      setGeneratingTests(false);
    }
  };

  const handleLangChange = useCallback((newLang: string) => {
    setLang(newLang);
    setCode(resolveStarterCode(newLang, null));
    setResults(null);
    setAiReview(null);
    setRunError(null);
  }, []);

  const executeCode = useCallback(async (): Promise<RunResult[] | null> => {
    const cases = testCases.filter((tc) => tc.input.trim() || tc.expected.trim());
    const body = {
      language: lang,
      code,
      stdin,
      timeout_ms: 15000,
      test_cases: cases.length > 0
        ? cases.map((tc) => ({ name: tc.name, input: tc.input, expected: tc.expected || undefined }))
        : [],
    };

    const res = await fetch("/api/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { results?: RunResult[]; error?: string };
    if (!res.ok || data.error) {
      setRunError(data.error ?? "Execution failed");
      return null;
    }
    const runResults = data.results ?? [];
    setResults(runResults);
    setRunError(null);
    return runResults;
  }, [lang, code, stdin, testCases]);

  const runAiReview = useCallback(async (runResults: RunResult[] | null) => {
    setAiLoading(true);
    setShowAiReview(true);
    try {
      const lastResult = runResults?.[0];
      const res = await fetch("/api/ai/analyze-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: lang,
          question: question ?? "",
          stdout: lastResult?.stdout ?? "",
          stderr: lastResult?.stderr ?? "",
          passed: runResults?.every((r) => r.passed) ?? false,
        }),
      });
      const data = await res.json() as AiReview;
      setAiReview(data);
      return data;
    } catch {
      const fallback: AiReview = {
        correctness: "unknown",
        timeComplexity: "unknown",
        spaceComplexity: "unknown",
        score: 0,
        bugs: [],
        improvements: [],
        overallFeedback: "AI review unavailable.",
      };
      setAiReview(fallback);
      return fallback;
    } finally {
      setAiLoading(false);
    }
  }, [code, lang, question]);

  const buildAnswerText = useCallback((runResults: RunResult[] | null, review: AiReview | null) => {
    const resultSummary = runResults && runResults.length > 0
      ? `\n\nTest results: ${runResults.map((r) =>
          `${r.name}: ${r.passed ? "PASSED" : "FAILED"}${r.stdout ? ` (output: ${r.stdout.slice(0, 100)})` : ""}${r.stderr ? ` (error: ${r.stderr.slice(0, 80)})` : ""}`,
        ).join(", ")}`
      : "";
    const complexityNote = complexity ? `\n\nTime/Space complexity: ${complexity}` : "";
    const reviewNote = review
      ? `\n\nAI review: score ${review.score}/5, correctness ${review.correctness}. ${review.overallFeedback}`
      : "";
    return `[Code submission — ${lang}]\n\`\`\`${lang}\n${code}\n\`\`\`${resultSummary}${complexityNote}${reviewNote}`;
  }, [lang, code, complexity]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setRunError(null);
    setResults(null);
    setShowOutput(true);
    setStatusMsg(null);
    try {
      await executeCode();
    } catch (e) {
      setRunError(String(e));
    } finally {
      setRunning(false);
    }
  }, [executeCode]);

  const handleRunAndSubmit = useCallback(async () => {
    if (!onSubmitAsAnswer || !code.trim()) return;
    setSubmitting(true);
    setStatusMsg("Running tests…");
    try {
      const runResults = await executeCode();
      setStatusMsg("Running AI review…");
      const review = await runAiReview(runResults);
      const answer = buildAnswerText(runResults, review);
      setStatusMsg("Submitting answer…");
      onSubmitAsAnswer(answer);
      setStatusMsg("Submitted — moving to next question");
    } catch (e) {
      setRunError(String(e));
      setStatusMsg(null);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmitAsAnswer, code, executeCode, runAiReview, buildAnswerText]);

  const handleAiReview = useCallback(async () => {
    await runAiReview(results);
  }, [runAiReview, results]);

  const resetCode = () => {
    setCode(resolveStarterCode(lang, starterCode));
    setResults(null);
    setAiReview(null);
    setRunError(null);
    setStatusMsg(null);
  };

  const isAvailable = (id: string) => {
    if (availableLangs.length === 0) return true;
    return availableLangs.find((l) => l.id === id)?.available !== false;
  };

  if (!showWorkspace) {
    return null;
  }

  const allPassed = results !== null && results.length > 0 && results.every((r) => r.passed);
  const anyFailed = results !== null && results.some((r) => !r.passed);
  const busy = running || submitting || aiLoading;

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-blue-200 bg-white dark:border-blue-900/50 dark:bg-zinc-950 overflow-hidden ring-1 ring-blue-100 dark:ring-blue-950">
      <div className="flex items-center justify-between gap-2 border-b border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">Coding Question</span>
          <span className="text-xs text-blue-600/70 dark:text-blue-400/70">Slot {slot}</span>
          {results !== null && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              allPassed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : anyFailed ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              {allPassed ? "✓ All passed" : anyFailed ? "✗ Some failed" : "Ran"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            onClick={resetCode}
            title="Reset to starter"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <CodeEditor
        language={lang}
        value={code}
        onChange={setCode}
        onRun={() => { if (!busy && code.trim()) void handleRun(); }}
      />

      <div className="grid grid-cols-2 gap-0 border-t border-zinc-200 dark:border-zinc-800">
        <div className="border-r border-zinc-200 dark:border-zinc-800 p-3">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Time / Space Complexity</label>
          <input
            type="text"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
            placeholder="e.g. O(n log n) / O(n)"
            className="mt-1 w-full text-xs bg-transparent border-0 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none"
          />
        </div>
        <div className="p-3">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Stdin (custom input)</label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Optional stdin for your program"
            rows={1}
            className="mt-1 w-full text-xs bg-transparent border-0 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowTestCases((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          <span>Test Cases ({testCases.length})</span>
          {showTestCases ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showTestCases && (
          <div className="px-4 pb-3 space-y-3">
            {generatingTests && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating test cases…
              </div>
            )}
            {!generatingTests && testCases.length === 0 && (
              <div className="text-sm text-zinc-400 py-2">
                Test cases generate automatically for coding questions. Use Regenerate if they look wrong for this problem.
              </div>
            )}
            {!generatingTests && testCases.length > 0 && testCaseSource === "heuristic" && (
              <div className="text-xs text-amber-400/90 mb-2">
                Using problem-specific default cases (AI output did not match this question).
              </div>
            )}
            {testCases.map((tc) => (
              <div key={tc.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
                <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">{tc.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase">Input</label>
                    <pre className="mt-1 text-xs font-mono whitespace-pre-wrap bg-white dark:bg-zinc-950 border rounded px-2 py-1.5">{tc.input || "(empty)"}</pre>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase">Expected</label>
                    <pre className="mt-1 text-xs font-mono whitespace-pre-wrap bg-white dark:bg-zinc-950 border rounded px-2 py-1.5">{tc.expected || "(empty)"}</pre>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => void generateTestCases()}
              disabled={generatingTests || !question.trim()}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" /> {testCases.length > 0 ? "Regenerate" : "Generate"} test cases
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5">
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={busy || !code.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running…" : "Run"}
        </button>
        {onSubmitAsAnswer && (
          <button
            type="button"
            disabled={busy || !code.trim()}
            onClick={() => void handleRunAndSubmit()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {submitting ? "Submitting…" : "Run & Submit"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleAiReview()}
          disabled={busy || !code.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-violet-300 dark:border-violet-700 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300 disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI Review
        </button>
        <span className="ml-auto text-[10px] text-zinc-400">Ctrl+Enter to run</span>
      </div>

      {statusMsg && (
        <div className="border-t border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 px-4 py-2 text-xs text-blue-800 dark:text-blue-200">
          {statusMsg}
        </div>
      )}

      {(results !== null || runError) && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowOutput((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase text-zinc-500"
          >
            <span>Output</span>
            {showOutput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showOutput && (
            <div className="px-4 pb-4 space-y-3">
              {runError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 p-3 text-xs font-mono text-red-800 dark:text-red-300">
                  {runError}
                </div>
              )}
              {results?.map((r, i) => (
                <div key={i} className={`rounded-lg border p-3 text-xs ${r.passed ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"}`}>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{r.passed ? "✓" : "✗"} {r.name}</span>
                    <span className="text-zinc-400 text-[10px]">exit {r.exit_code}{r.timed_out ? " · timeout" : ""}</span>
                  </div>
                  {r.stdout && <pre className="whitespace-pre-wrap font-mono max-h-40 overflow-auto">{r.stdout}</pre>}
                  {r.stderr && <pre className="mt-2 whitespace-pre-wrap font-mono text-red-700 dark:text-red-300 max-h-32 overflow-auto">{r.stderr}</pre>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(aiReview || aiLoading) && showAiReview && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 pb-4">
          {aiLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing code…
            </div>
          ) : aiReview && (
            <div className="space-y-3 pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{aiReview.score}/5</div>
                  <div className="text-[10px] text-zinc-400">Score</div>
                </div>
                <div className="rounded-lg border p-3 text-center capitalize">{aiReview.correctness}</div>
                <div className="rounded-lg border p-3 text-center font-mono text-sm">{aiReview.timeComplexity || "—"}</div>
                <div className="rounded-lg border p-3 text-center font-mono text-sm">{aiReview.spaceComplexity || "—"}</div>
              </div>
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 p-3 text-sm">{aiReview.overallFeedback}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
