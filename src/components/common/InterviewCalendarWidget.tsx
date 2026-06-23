"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

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
  IN_PROGRESS: "bg-yellow-500",
  COMPLETED: "bg-emerald-500",
  REVIEW_PENDING: "bg-amber-500",
  SIGNED_OFF: "bg-purple-500",
};

export function InterviewCalendarWidget({ className = "" }: { className?: string }) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

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
      <div className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-zinc-100 dark:bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-zinc-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">This Week</h3>
        </div>
        <Link
          href="/admin/calendar"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          View full calendar →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, i) => {
          const isToday = date.toDateString() === today.toDateString();
          const dayInterviews = interviewsByDate[date.toDateString()] ?? [];
          
          return (
            <div
              key={i}
              className={`min-h-[60px] rounded-lg border p-2 text-center ${
                isToday
                  ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
                  : "border-zinc-100 dark:border-zinc-800"
              }`}
            >
              <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-sm font-semibold ${
                  isToday ? "text-blue-600 dark:text-blue-400" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayInterviews.slice(0, 2).map((iv) => (
                  <div
                    key={iv.id}
                    className="flex items-center justify-center gap-1"
                    title={`${iv.candidateName} - ${iv.status}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[iv.status] ?? "bg-zinc-400"}`} />
                  </div>
                ))}
                {dayInterviews.length > 2 && (
                  <div className="text-[9px] text-zinc-400">+{dayInterviews.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-zinc-500">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Scheduled
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Completed
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Signed Off
        </div>
      </div>
    </div>
  );
}