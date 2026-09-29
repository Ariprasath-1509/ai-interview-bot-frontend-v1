"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ArrowUpRight } from "lucide-react";

interface Interview {
  id: string;
  status: string;
  candidateName: string;
  jdTitle: string;
  createdAt: string;
  interviewMode: string;
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  REVIEW_PENDING: "bg-yellow-500",
  SIGNED_OFF: "bg-purple-500",
};

export function InterviewCalendarWidget({ className = "" }: { className?: string }) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/interviews/summary")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInterviews)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const interviewsByDate: Record<string, Interview[]> = {};
  interviews.forEach((iv) => {
    const d = new Date(iv.createdAt);
    const key = d.toDateString();
    if (!interviewsByDate[key]) interviewsByDate[key] = [];
    interviewsByDate[key].push(iv);
  });

  if (loading) {
    return (
      <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/3 rounded-lg bg-[var(--surface-subtle)]" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--surface-subtle)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl transition-all duration-300 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[var(--text-primary)]">This Week</h3>
            <p className="text-[10px] font-medium text-[var(--text-secondary)]">Weekly interview overview</p>
          </div>
        </div>
        <Link
          href="/admin/calendar"
          className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline transition-colors"
        >
          Full Calendar <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, i) => {
          const isToday = date.toDateString() === today.toDateString();
          const dayInterviews = interviewsByDate[date.toDateString()] ?? [];
          
          return (
            <div
              key={i}
              className={`min-h-[70px] rounded-xl border p-2 text-center transition-all ${
                isToday
                  ? "border-[#6D28D9]/40 bg-[#6D28D9]/10 shadow-2xs"
                  : "border-[var(--border)] bg-[var(--surface-subtle)]/30 hover:bg-[var(--surface-subtle)]/70"
              }`}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  isToday ? "text-[#6D28D9] dark:text-purple-300" : "text-[var(--text-primary)]"
                }`}
              >
                {date.getDate()}
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1 flex-wrap">
                {dayInterviews.slice(0, 3).map((iv) => (
                  <span
                    key={iv.id}
                    className={`h-2 w-2 rounded-full ${STATUS_DOT[iv.status] ?? "bg-zinc-400"}`}
                    title={`${iv.candidateName} - ${iv.status}`}
                  />
                ))}
                {dayInterviews.length > 3 && (
                  <span className="text-[9px] font-bold text-[var(--text-secondary)]">+{dayInterviews.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          In Progress
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Completed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          Signed Off
        </div>
      </div>
    </div>
  );
}