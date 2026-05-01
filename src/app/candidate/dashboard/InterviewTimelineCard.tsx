"use client";

import { StatusTimeline, buildInterviewTimeline } from "@/components/common/StatusTimeline";

type Interview = {
  id: string;
  status: string;
  scheduledAt: string | null;
  endedAt: string | null;
  jdId: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
};

export function InterviewTimelineCard({ interview }: { interview: Interview }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/70 p-5 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">Latest Progress</h3>
      <StatusTimeline steps={buildInterviewTimeline(interview)} />
    </div>
  );
}