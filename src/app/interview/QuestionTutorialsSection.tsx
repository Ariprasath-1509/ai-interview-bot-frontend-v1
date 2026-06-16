"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ChevronDown, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QuestionTutorial, TutoringStatus } from "@/app/interview/assessmentUtils";

const COVERAGE_LABEL: Record<string, string> = {
  strong: "Strong",
  partial: "Partial",
  weak: "Weak",
  missing: "Missing",
};

const COVERAGE_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  strong: "success",
  partial: "warning",
  weak: "secondary",
  missing: "destructive",
};

const COVERAGE_CLASS: Record<string, string> = {
  weak: "!bg-orange-100 !text-orange-800 dark:!bg-orange-950/40 dark:!text-orange-300 border-transparent",
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  CODING: "Coding",
};

type Props = {
  interviewId: string;
  initialTutorials?: QuestionTutorial[];
  initialTutoringStatus?: TutoringStatus;
  assessmentStatus?: string | null;
};

function normalizeTutorials(raw: unknown): QuestionTutorial[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const slotNumber = typeof row.slotNumber === "number" ? row.slotNumber : index + 1;
      return {
        slotNumber,
        questionType: typeof row.questionType === "string" ? row.questionType : "TECHNICAL",
        tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
        question: typeof row.question === "string" ? row.question : "",
        candidateAnswer: typeof row.candidateAnswer === "string" ? row.candidateAnswer : "(no answer)",
        expectedAnswer: typeof row.expectedAnswer === "string" ? row.expectedAnswer : "",
        tutorNote: typeof row.tutorNote === "string" ? row.tutorNote : "",
        coverage: (typeof row.coverage === "string" ? row.coverage : "partial") as QuestionTutorial["coverage"],
      };
    })
    .filter((t) => t.question.trim().length > 0);
}

export function QuestionTutorialsSection({
  interviewId,
  initialTutorials = [],
  initialTutoringStatus,
  assessmentStatus,
}: Props) {
  const [tutorials, setTutorials] = useState<QuestionTutorial[]>(initialTutorials);
  const [tutoringStatus, setTutoringStatus] = useState<TutoringStatus | undefined>(initialTutoringStatus);
  const [loading, setLoading] = useState(
    assessmentStatus === "PROCESSING"
      || (!initialTutoringStatus && initialTutorials.length === 0 && assessmentStatus !== "FAILED"),
  );

  const applyAssessmentResult = useCallback((result: Record<string, unknown> | undefined) => {
    if (!result) return;
    const feedback = result.candidateFeedback as Record<string, unknown> | undefined;
    if (!feedback) return;

    const status = feedback.tutoringStatus as TutoringStatus | undefined;
    const items = normalizeTutorials(feedback.questionTutorials);
    if (status) setTutoringStatus(status);
    if (items.length > 0) setTutorials(items);
  }, []);

  useEffect(() => {
    const shouldPoll =
      assessmentStatus === "PROCESSING"
      || tutoringStatus === "PROCESSING"
      || (!tutoringStatus && tutorials.length === 0 && assessmentStatus !== "FAILED");

    if (!shouldPoll) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

    async function poll() {
      if (cancelled || attempts >= maxAttempts) {
        setLoading(false);
        return;
      }
      attempts += 1;

      try {
        const res = await fetch(`/api/ai/assess-status/${encodeURIComponent(interviewId)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setTimeout(poll, 2000);
          return;
        }

        const data = (await res.json()) as {
          status?: string;
          result?: Record<string, unknown>;
        };

        if (data.status === "COMPLETED" && data.result) {
          applyAssessmentResult(data.result);
          const feedback = data.result.candidateFeedback as Record<string, unknown> | undefined;
          const status = feedback?.tutoringStatus as TutoringStatus | undefined;
          setTutoringStatus(status ?? "COMPLETED");
          setLoading(false);
          return;
        }

        if (data.status === "FAILED") {
          setTutoringStatus("FAILED");
          setLoading(false);
          return;
        }

        if (data.status === "PROCESSING") {
          setTutoringStatus("PROCESSING");
        }
      } catch {
        // keep polling
      }

      setTimeout(poll, 2000);
    }

    setLoading(true);
    poll();
    return () => {
      cancelled = true;
    };
  }, [interviewId, assessmentStatus, tutoringStatus, tutorials.length, applyAssessmentResult]);

  if (tutoringStatus === "FAILED") {
    return null;
  }

  if (loading && tutorials.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Learn from your interview
        </h2>
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-6 text-sm text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          <div>
            <p className="font-medium">Generating personalized tutoring…</p>
            <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-300/80">
              Reviewing your answers and preparing model responses calibrated to your experience level.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (tutorials.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Learn from your interview
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Question-by-question coaching with expected answers at your experience level.
        </p>
      </div>

      <div className="space-y-3">
        {tutorials.map((item) => {
          const coverage = item.coverage ?? "partial";
          const coverageKey = coverage.toLowerCase();
          return (
            <details
              key={item.slotNumber}
              className="group rounded-2xl border border-zinc-200 bg-white open:shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {item.slotNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {item.questionType && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {QUESTION_TYPE_LABEL[item.questionType] ?? item.questionType}
                      </Badge>
                    )}
                    <Badge
                      variant={COVERAGE_VARIANT[coverageKey] ?? "secondary"}
                      className={COVERAGE_CLASS[coverageKey] ?? ""}
                    >
                      {COVERAGE_LABEL[coverageKey] ?? coverage}
                    </Badge>
                    {item.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                    {item.question}
                  </p>
                </div>
                <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
              </summary>

              <div className="space-y-4 border-t border-zinc-100 px-4 pb-5 pt-4 sm:px-5 dark:border-zinc-800">
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Your answer
                  </h4>
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {item.candidateAnswer?.trim() ? item.candidateAnswer : "(no answer)"}
                  </p>
                </div>

                {item.expectedAnswer && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                      Expected answer
                    </h4>
                    <p className="text-sm leading-relaxed text-emerald-950 dark:text-emerald-100">
                      {item.expectedAnswer}
                    </p>
                  </div>
                )}

                {item.tutorNote && (
                  <div className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Tip
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                        {item.tutorNote}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
