"use client";

export type TimelineStep = {
  label: string;
  status: "completed" | "current" | "upcoming";
  date?: string;
};

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="relative flex flex-col gap-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="flex gap-3">
            {/* Dot + Line */}
            <div className="flex flex-col items-center">
              <div
                className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  step.status === "completed"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : step.status === "current"
                    ? "border-blue-500 bg-blue-500 text-white animate-pulse"
                    : "border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                }`}
              >
                {step.status === "completed" ? "✓" : i + 1}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[28px] ${
                    step.status === "completed"
                      ? "bg-emerald-400"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
            {/* Content */}
            <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-medium ${
                  step.status === "completed"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : step.status === "current"
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{step.date}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Build timeline steps from interview data */
export function buildInterviewTimeline(interview: {
  status: string;
  scheduledAt?: string | null;
  endedAt?: string | null;
  proposedVerdict?: string | null;
  finalVerdict?: string | null;
}): TimelineStep[] {
  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined;

  const s = interview.status;
  const steps: TimelineStep[] = [];

  const order = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEW_PENDING", "SIGNED_OFF"];
  const idx = order.indexOf(s);

  steps.push({
    label: "Scheduled",
    status: idx >= 0 ? "completed" : "upcoming",
    date: fmt(interview.scheduledAt),
  });
  steps.push({
    label: "In Progress",
    status: idx > 0 ? "completed" : idx === 0 ? "upcoming" : s === "IN_PROGRESS" ? "current" : "upcoming",
  });
  steps.push({
    label: "Completed",
    status: idx >= 2 ? "completed" : s === "IN_PROGRESS" ? "upcoming" : "upcoming",
    date: idx >= 2 ? fmt(interview.endedAt) : undefined,
  });
  steps.push({
    label: "Review Pending",
    status: idx >= 3 ? "completed" : idx === 2 ? (s === "REVIEW_PENDING" ? "current" : "upcoming") : "upcoming",
  });

  const verdict = interview.finalVerdict ?? interview.proposedVerdict;
  steps.push({
    label: verdict === "WITHDRAWN" ? "Withdrawn" : idx >= 4 ? `Signed Off — ${verdict?.replace(/_/g, " ") ?? ""}` : "Sign Off",
    status: idx >= 4 ? "completed" : idx === 3 ? "upcoming" : "upcoming",
  });

  // Fix: mark the current step
  if (idx >= 0 && idx < order.length) {
    const currentIdx = idx;
    steps.forEach((step, i) => {
      if (i < currentIdx) step.status = "completed";
      else if (i === currentIdx) step.status = "current";
      else step.status = "upcoming";
    });
  }

  return steps;
}
