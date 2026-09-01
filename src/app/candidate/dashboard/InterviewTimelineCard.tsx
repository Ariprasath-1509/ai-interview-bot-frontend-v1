"use client";

import { StatusTimeline, buildInterviewTimeline } from "@/components/common/StatusTimeline";
import { Clock } from "lucide-react";

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
    <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/40">
      <div className="panel-header panel-header-accent-indigo flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
          <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Latest Technical Interview Progress
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
          Live Tracker
        </span>
      </div>
      <div className="p-5">
        <StatusTimeline steps={buildInterviewTimeline(interview)} />
      </div>
    </div>
  );
}