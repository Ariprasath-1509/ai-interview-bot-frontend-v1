"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, RotateCcw, Sparkles, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

// ── Language config ────────────────────────────────────────────────────────────
export const LANGUAGES = [
  { id: "python",     label: "Python",     ext: ".py"  },
  { id: "javascript", label: "JavaScript", ext: ".js"  },
  { id: "typescript", label: "TypeScript", ext: ".ts"  },
  { id: "java",       label: "Java",       ext: ".java"},
  { id: "cpp",        label: "C++",        ext: ".cpp" },
  { id: "c",          label: "C",          ext: ".c"   },
  { id: "go",         label: "Go",         ext: ".go"  },
  { id: "rust",       label: "Rust",       ext: ".rs"  },
  { id: "csharp",     label: "C# (.NET)",  ext: ".cs"  },
  { id: "kotlin",     label: "Kotlin",     ext: ".kt"  },
  { id: "ruby",       label: "Ruby",       ext: ".rb"  },
  { id: "php",        label: "PHP",        ext: ".php" },
  { id: "swift",      label: "Swift",      ext: ".swift"},
  { id: "bash",       label: "Bash",       ext: ".sh"  },
];

const STARTERS: Record<string, string> = {
  python:     "def solution():\n    # Write your solution here\n    pass\n\nif __name__ == \"__main__\":\n    solution()\n",
  javascript: "function solution() {\n  // Write your solution here\n}\n\nconsole.log(solution());\n",
  typescript: "function solution(): void {\n  // Write your solution here\n}\n\nsolution();\n",
  java:       "public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n",
  cpp:        "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
  c:          "#include <stdio.h>\n\nint main(void) {\n    // Write your solution here\n    return 0;\n}\n",
  go:         "package main\n\nimport \"fmt\"\n\nfunc main() {\n\t// Write your solution here\n\tfmt.Println(\"Hello\")\n}\n",
  rust:       "fn main() {\n    // Write your solution here\n    println!(\"Hello\");\n}\n",
  csharp:     "using System;\n\nclass Program {\n    static void Main() {\n        // Write your solution here\n    }\n}\n",
  kotlin:     "fun main() {\n    // Write your solution here\n    println(\"Hello\")\n}\n",
  ruby:       "# Write your solution here\nputs \"Hello\"\n",
  php:        "<?php\n// Write your solution here\necho \"Hello\";\n",
  swift:      "// Write your solution here\nprint(\"Hello\")\n",
  bash:       "#!/bin/bash\n# Write your solution here\necho \"Hello\"\n",
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface TestCase {
  id: string;
  name: string;
  input: string;
  expected: string;
}

interface RunResult {
  name: string;
  passed: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
}

interface AiReview {
  correctness: string;
  timeComplexity: string;
  spaceComplexity: string;
  score: number;
  bugs: string[];
  improvements: string[];
  overallFeedback: string;
}

interface LangInfo { id: string; label: string; available: boolean; }

export interface CodeSubmission {
  language: string;
  code: string;
  results: RunResult[] | null;
  aiReview: AiReview | null;
  complexity: string;
}

interface Props {
  question?: string;
  onSubmissionChange?: (sub: CodeSubmission) => void;
  onSubmitAsAnswer?: (answer: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function CodeWorkspace({ question, onSubmissionChange, onSubmitAsAnswer }: Props) {
  const [lang, setLang] = useState("python");
  const [code, setCode] = useState(STARTERS.python);
  const [stdin, setStdin] = useState("");
  const [complexity, setComplexity] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [generatingTests, setGeneratingTests] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [availableLangs, setAvailableLangs] = useState<LangInfo[]>([]);
  const [showTestCases, setShowTestCases] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [showAiReview, setShowAiReview] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available languages on mount
  useEffect(() => {
    fetch("/api/code")
      .then((r) => r.json())
      .then((d: { languages?: LangInfo[] }) => { if (d.languages) setAvailableLangs(d.languages); })
      .catch(() => {});
  }, []);

  // Generate test cases when question changes
  useEffect(() => {
    if (question && question.trim().length > 20 && testCases.length === 0) {
      // Only generate if question contains coding-related keywords
      const lowerQ = question.toLowerCase();
      const codingKeywords = [
        'write', 'code', 'implement', 'function', 'algorithm', 'program',
        'solve', 'return', 'input', 'output', 'array', 'string', 'loop',
        'class', 'method', 'variable', 'print', 'calculate', 'sort', 'search'
      ];
      const isCodingQuestion = codingKeywords.some(kw => lowerQ.includes(kw));
      if (isCodingQuestion) {
        generateTestCases();
      }
    }
  }, [question]);

  const generateTestCases = async () => {
    if (!question || generatingTests) return;
    setGeneratingTests(true);
    try {
      const res = await fetch("/api/code/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language: lang }),
      });
      const data = await res.json();
      if (data.testCases && data.testCases.length > 0) {
        setTestCases(data.testCases);
      }
    } catch (err) {
      console.error("Failed to generate test cases:", err);
    } finally {
      setGeneratingTests(false);
    }
  };

  // Notify parent of submission state
  useEffect(() => {
    onSubmissionChange?.({ language: lang, code, results, aiReview, complexity });
  }, [lang, code, results, aiReview, complexity, onSubmissionChange]);

  const handleLangChange = useCallback((newLang: string) => {
    setLang(newLang);
    setCode(STARTERS[newLang] ?? "// Write your solution here\n");
    setResults(null);
    setAiReview(null);
    setRunError(null);
  }, []);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setRunError(null);
    setResults(null);
    setShowOutput(true);

    try {
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

      const data = await res.json() as { results?: RunResult[]; error?: string; ok?: boolean };

      if (!res.ok || data.error) {
        setRunError(data.error ?? "Execution failed");
      } else {
        setResults(data.results ?? []);
      }
    } catch (e) {
      setRunError(String(e));
    } finally {
      setRunning(false);
    }
  }, [lang, code, stdin, testCases]);

  const handleAiReview = useCallback(async () => {
    setAiLoading(true);
    setShowAiReview(true);
    try {
      const lastResult = results?.[0];
      const res = await fetch("/api/ai/analyze-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: lang,
          question: question ?? "",
          stdout: lastResult?.stdout ?? "",
          stderr: lastResult?.stderr ?? "",
          passed: lastResult?.passed ?? false,
        }),
      });
      const data = await res.json() as AiReview;
      setAiReview(data);
    } catch {
      setAiReview({
        correctness: "unknown",
        timeComplexity: "unknown",
        spaceComplexity: "unknown",
        score: 0,
        bugs: [],
        improvements: [],
        overallFeedback: "AI review unavailable.",
      });
    } finally {
      setAiLoading(false);
    }
  }, [code, lang, question, results]);

  const addTestCase = () => {
    const id = String(Date.now());
    setTestCases((prev) => [...prev, { id, name: `Case ${prev.length + 1}`, input: "", expected: "" }]);
  };

  const removeTestCase = (id: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string) => {
    setTestCases((prev) => prev.map((tc) => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const resetCode = () => {
    setCode(STARTERS[lang] ?? "");
    setResults(null);
    setAiReview(null);
    setRunError(null);
  };

  const isAvailable = (id: string) => {
    if (availableLangs.length === 0) return true;
    return availableLangs.find((l) => l.id === id)?.available !== false;
  };

  const canGenerateTests = question && question.trim().length > 20 && !generatingTests && (() => {
    const lowerQ = question.toLowerCase();
    const codingKeywords = [
      'write', 'code', 'implement', 'function', 'algorithm', 'program',
      'solve', 'return', 'input', 'output', 'array', 'string', 'loop',
      'class', 'method', 'variable', 'print', 'calculate', 'sort', 'search'
    ];
    return codingKeywords.some(kw => lowerQ.includes(kw));
  })();

  const allPassed = results !== null && results.length > 0 && results.every((r) => r.passed);
  const anyFailed = results !== null && results.some((r) => !r.passed);

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Code</span>
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
          {/* Language selector */}
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}{!isAvailable(l.id) ? " ⚠️" : ""}
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

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={editorRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[320px] resize-y bg-zinc-950 text-zinc-100 font-mono text-sm px-4 py-3 focus:outline-none leading-relaxed"
          style={{ tabSize: 2 }}
          onKeyDown={(e) => {
            // Tab key inserts spaces
            if (e.key === "Tab") {
              e.preventDefault();
              const el = e.currentTarget;
              const start = el.selectionStart;
              const end = el.selectionEnd;
              const newCode = code.substring(0, start) + "  " + code.substring(end);
              setCode(newCode);
              requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + 2;
              });
            }
            // Ctrl+Enter / Cmd+Enter to run
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (!running && code.trim()) void handleRun();
            }
          }}
        />
        {/* Line numbers overlay hint */}
        <div className="absolute top-3 right-3 text-[10px] text-zinc-600 select-none pointer-events-none">
          {code.split("\n").length} lines
        </div>
      </div>

      {/* Complexity + stdin row */}
      <div className="grid grid-cols-2 gap-0 border-t border-zinc-200 dark:border-zinc-800">
        <div className="border-r border-zinc-200 dark:border-zinc-800 p-3">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Time / Space Complexity
          </label>
          <input
            type="text"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
            placeholder="e.g. O(n log n) / O(n)"
            className="mt-1 w-full text-xs bg-transparent border-0 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none"
          />
        </div>
        <div className="p-3">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Stdin (custom input)
          </label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Optional stdin for your program"
            rows={1}
            className="mt-1 w-full text-xs bg-transparent border-0 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Test Cases */}
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowTestCases((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <span>Test Cases ({testCases.length})</span>
          {showTestCases ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showTestCases && (
          <div className="px-4 pb-3 space-y-3">
            {generatingTests && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating test cases from question...
              </div>
            )}
            {!generatingTests && testCases.length === 0 && (
              <div className="text-sm text-zinc-400 py-2">
                {question ? "Click 'Generate Tests' to create AI test cases" : "Add a coding question first"}
              </div>
            )}
            {testCases.map((tc) => (
              <div key={tc.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
                <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">{tc.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Input</label>
                    <pre className="mt-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5">{tc.input || "(empty)"}</pre>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Expected Output</label>
                    <pre className="mt-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5">{tc.expected || "(empty)"}</pre>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={generateTestCases}
              disabled={!canGenerateTests}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-3 w-3" /> {testCases.length > 0 ? "Regenerate" : "Generate"} test cases with AI
            </button>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5">
        <button
          type="button"
          onClick={handleRun}
          disabled={running || !code.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running…" : "Run"}
        </button>
        <button
          type="button"
          onClick={handleAiReview}
          disabled={aiLoading || !code.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/50 disabled:opacity-50 transition-colors"
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aiLoading ? "Analyzing…" : "AI Review"}
        </button>
        {onSubmitAsAnswer && (
          <button
            type="button"
            disabled={!code.trim()}
            onClick={() => {
              // Build a rich answer string the voice interview AI can assess
              const resultSummary = results && results.length > 0
                ? `\n\nTest results: ${results.map(r => `${r.name}: ${r.passed ? "PASSED" : "FAILED"}${r.stdout ? ` (output: ${r.stdout.slice(0, 100)})` : ""}${r.stderr ? ` (error: ${r.stderr.slice(0, 80)})` : ""}`).join(", ")}`
                : "";
              const complexityNote = complexity ? `\n\nTime/Space complexity: ${complexity}` : "";
              const answer = `[Code submission — ${lang}]\n\`\`\`${lang}\n${code}\n\`\`\`${resultSummary}${complexityNote}`;
              onSubmitAsAnswer(answer);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            ↩ Submit as answer
          </button>
        )}
        {!onSubmitAsAnswer && (
          <span className="ml-auto text-[10px] text-zinc-400">Tab = 2 spaces · Ctrl+Enter to run</span>
        )}
      </div>

      {/* Ctrl+Enter shortcut */}
      {/* handled via keydown on textarea below */}

      {/* Output */}
      {(results !== null || runError) && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowOutput((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span>Output</span>
            {showOutput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showOutput && (
            <div className="px-4 pb-4 space-y-3">
              {runError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 text-xs font-mono text-red-800 dark:text-red-300">
                  {runError}
                </div>
              )}
              {results?.map((r, i) => (
                <div key={i} className={`rounded-lg border p-3 text-xs ${
                  r.passed
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${r.passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                      {r.passed ? "✓" : "✗"} {r.name}
                    </span>
                    <span className="text-zinc-400 text-[10px]">exit {r.exit_code}{r.timed_out ? " · timed out" : ""}</span>
                  </div>
                  {r.stdout && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-zinc-400">stdout</span>
                      <pre className="mt-0.5 whitespace-pre-wrap font-mono text-zinc-700 dark:text-zinc-300 max-h-40 overflow-auto">{r.stdout}</pre>
                    </div>
                  )}
                  {r.stderr && (
                    <div className="mt-2">
                      <span className="text-[10px] uppercase tracking-wide text-red-400">stderr</span>
                      <pre className="mt-0.5 whitespace-pre-wrap font-mono text-red-700 dark:text-red-300 max-h-32 overflow-auto">{r.stderr}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Review */}
      {(aiReview || aiLoading) && showAiReview && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowAiReview((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
          >
            <span>✨ AI Code Review</span>
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <div className="px-4 pb-4">
            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your code…
              </div>
            )}
            {aiReview && !aiLoading && (
              <div className="space-y-4">
                {/* Score + metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                    <div className={`text-2xl font-bold ${
                      aiReview.score >= 4 ? "text-emerald-600 dark:text-emerald-400"
                      : aiReview.score >= 3 ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                    }`}>{aiReview.score}/5</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Score</div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                    <div className={`text-sm font-semibold capitalize ${
                      aiReview.correctness === "correct" ? "text-emerald-600 dark:text-emerald-400"
                      : aiReview.correctness === "partial" ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                    }`}>{aiReview.correctness}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Correctness</div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                    <div className="text-sm font-mono font-semibold text-zinc-700 dark:text-zinc-300">{aiReview.timeComplexity || "—"}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Time</div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                    <div className="text-sm font-mono font-semibold text-zinc-700 dark:text-zinc-300">{aiReview.spaceComplexity || "—"}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Space</div>
                  </div>
                </div>

                {/* Overall feedback */}
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 p-3 text-sm text-violet-900 dark:text-violet-200">
                  {aiReview.overallFeedback}
                </div>

                {/* Bugs */}
                {aiReview.bugs?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">🐛 Bugs / Issues</div>
                    <ul className="space-y-1">
                      {aiReview.bugs.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="text-red-400 mt-0.5 shrink-0">•</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {aiReview.improvements?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">💡 Improvements</div>
                    <ul className="space-y-1">
                      {aiReview.improvements.map((imp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="text-blue-400 mt-0.5 shrink-0">•</span>{imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
