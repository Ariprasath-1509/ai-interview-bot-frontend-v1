"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, AlertCircle } from "lucide-react";
import type { StructuredProblem } from "@/app/api/code/problem/route";

interface Props {
  problem: StructuredProblem;
  language: string;
  loading?: boolean;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <pre className="rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-[12px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "amber" | "violet" }) {
  const cls = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  }[color];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export function ProblemPanelSkeleton() {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 animate-pulse space-y-3">
      <div className="h-5 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
      <div className="h-3 w-4/5 bg-zinc-100 dark:bg-zinc-900 rounded" />
      <div className="h-16 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
        <div className="h-14 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
      </div>
    </div>
  );
}

export function ProblemPanel({ problem, language, loading }: Props) {
  const [showHints, setShowHints] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return <ProblemPanelSkeleton />;

  const sig = problem.functionSignature[language] ?? problem.functionSignature["python"] ?? null;

  return (
    <div className="border-b border-blue-200 dark:border-blue-900/50">
      {/* Panel header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Problem</span>
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-200 truncate">{problem.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {problem.hints.length > 0 && (
            <span className="text-[10px] text-blue-500 dark:text-blue-400">
              {problem.hints.length} hint{problem.hints.length > 1 ? "s" : ""} available
            </span>
          )}
          {collapsed
            ? <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
            : <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          {/* Description */}
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {problem.description}
          </p>

          {/* Function signature */}
          {sig && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Function Signature ({language})
                </span>
                <Badge color="violet">implement this</Badge>
              </div>
              <CodeBlock code={sig} language={language} />
            </div>
          )}

          {/* Input / Output format */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Input format</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{problem.inputFormat}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Output format</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{problem.outputFormat}</p>
            </div>
          </div>

          {/* Constraints */}
          {problem.constraints.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Constraints</div>
              <ul className="space-y-0.5">
                {problem.constraints.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <span className="font-mono">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Examples */}
          {problem.examples.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Examples</div>
              <div className="space-y-3">
                {problem.examples.map((ex, i) => (
                  <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-700">
                      <div className="px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Input</div>
                        <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{ex.input || "(empty)"}</pre>
                      </div>
                      <div className="px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Output</div>
                        <pre className="text-xs font-mono text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap">{ex.output || "(empty)"}</pre>
                      </div>
                    </div>
                    {ex.explanation && (
                      <div className="border-t border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50">
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">{ex.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output format reminder */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Output note: </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400">{problem.outputFormat}</span>
            </div>
          </div>

          {/* Hints (collapsible) */}
          {problem.hints.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowHints((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {showHints ? "Hide hints" : `Show ${problem.hints.length} hint${problem.hints.length > 1 ? "s" : ""}`}
              </button>
              {showHints && (
                <ul className="mt-2 space-y-1.5">
                  {problem.hints.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 px-3 py-2">
                      <Lightbulb className="h-3 w-3 text-violet-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-violet-700 dark:text-violet-300">{h}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
