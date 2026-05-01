"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonDashboard } from "@/components/common/Skeleton";

interface InterviewSummary {
  id: string;
  status: string;
  candidateName: string;
  jdTitle: string;
  createdAt: string;
  interviewMode: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  COMPLETED: "bg-emerald-500",
  REVIEW_PENDING: "bg-amber-500",
  SIGNED_OFF: "bg-purple-500",
};

export function CalendarClient() {
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch("/api/interviews/summary")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInterviews)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonDashboard />;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const interviewsByDate: Record<string, InterviewSummary[]> = {};
  interviews.forEach((iv) => {
    const d = new Date(iv.createdAt);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const key = d.getDate().toString();
      if (!interviewsByDate[key]) interviewsByDate[key] = [];
      interviewsByDate[key].push(iv);
    }
  });

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prev} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronLeft size={18} /></button>
        <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <button onClick={next} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronRight size={18} /></button>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500">{d}</div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayInterviews = day ? interviewsByDate[day.toString()] ?? [] : [];
            return (
              <div
                key={i}
                className={`min-h-[80px] border-b border-r border-zinc-100 p-1.5 dark:border-zinc-800/50 ${
                  !day ? "bg-zinc-50/50 dark:bg-zinc-900/20" : ""
                } ${isToday ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
              >
                {day && (
                  <>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-400"
                    }`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayInterviews.slice(0, 3).map((iv) => (
                        <Link
                          key={iv.id}
                          href={`/admin/interviews/${iv.id}/review`}
                          className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 truncate"
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[iv.status] ?? "bg-zinc-400"}`} />
                          <span className="truncate">{iv.candidateName}</span>
                        </Link>
                      ))}
                      {dayInterviews.length > 3 && (
                        <span className="block px-1 text-[10px] text-zinc-400">+{dayInterviews.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            {status.replace(/_/g, " ")}
          </div>
        ))}
      </div>
    </div>
  );
}
