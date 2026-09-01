"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Sparkles, CheckCircle2, ArrowUpRight } from "lucide-react";
import { SkeletonDashboard } from "@/components/common/Skeleton";
import { Button } from "@/components/ui/button";

interface InterviewSummary {
  id: string;
  status: string;
  candidateName: string;
  jdTitle: string;
  createdAt: string;
  interviewMode: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const STATUS_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  SCHEDULED: {
    label: "Scheduled",
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20",
  },
  IN_PROGRESS: {
    label: "In Progress",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20",
  },
  COMPLETED: {
    label: "Completed",
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20",
  },
  REVIEW_PENDING: {
    label: "Review Pending",
    dotClass: "bg-yellow-500",
    badgeClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20 hover:bg-yellow-500/20",
  },
  SIGNED_OFF: {
    label: "Signed Off",
    dotClass: "bg-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20",
  },
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
  let totalThisMonth = 0;
  let scheduledCount = 0;
  let completedCount = 0;

  interviews.forEach((iv) => {
    const d = new Date(iv.createdAt);
    if (d.getMonth() === month && d.getFullYear() === year) {
      totalThisMonth++;
      if (iv.status === 'SCHEDULED' || iv.status === 'IN_PROGRESS') scheduledCount++;
      if (iv.status === 'COMPLETED' || iv.status === 'SIGNED_OFF') completedCount++;

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
  function resetToToday() {
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="w-full space-y-6 animate-in">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 h-48 w-48 -mr-12 -mt-12 rounded-full bg-gradient-to-br from-[#6D28D9]/10 via-[#7C3AED]/5 to-transparent blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#4C1D95] text-white shadow-md shadow-purple-500/20">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Interview Calendar</h1>
              <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                Manage and view all scheduled, in-progress, completed, and signed-off candidate interviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={resetToToday}
              className="rounded-xl bg-[var(--surface-subtle)] font-bold text-xs cursor-pointer hover:bg-[var(--surface-subtle)]/80 transition-all border border-[var(--border)]"
            >
              Today
            </Button>
            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-1">
              <button
                type="button"
                onClick={prev}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                aria-label="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-extrabold text-[var(--text-primary)] min-w-[120px] text-center">
                {MONTHS[month]} {year}
              </span>
              <button
                type="button"
                onClick={next}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                aria-label="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Interviews</p>
            <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">{totalThisMonth}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Scheduled &amp; Active</p>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{scheduledCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Completed / Signed Off</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Calendar Grid Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-subtle)]/70">
          {DAYS.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              {d}
            </div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border)] bg-[var(--border)]">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayInterviews = day ? interviewsByDate[day.toString()] ?? [] : [];

            return (
              <div
                key={i}
                className={`min-h-[110px] p-2 bg-[var(--surface)] transition-all duration-150 relative ${
                  !day ? "bg-[var(--surface-subtle)]/30" : "hover:bg-[var(--surface-subtle)]/40"
                } ${isToday ? "bg-[#6D28D9]/5 ring-1 ring-inset ring-[#6D28D9]/30" : ""}`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold transition-transform ${
                          isToday
                            ? "bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white shadow-xs scale-105"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {day}
                      </span>
                      {dayInterviews.length > 0 && (
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md">
                          {dayInterviews.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayInterviews.slice(0, 3).map((iv) => {
                        const cfg = STATUS_CONFIG[iv.status] ?? {
                          label: iv.status,
                          dotClass: "bg-zinc-400",
                          badgeClass: "bg-[var(--surface-subtle)] text-[var(--text-primary)] border-[var(--border)]",
                        };

                        return (
                          <Link
                            key={iv.id}
                            href={`/admin/interviews/${iv.id}/review`}
                            className={`group flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold transition-all hover:scale-[1.02] cursor-pointer ${cfg.badgeClass}`}
                            title={`${iv.candidateName} — ${iv.jdTitle || 'Interview'} (${cfg.label})`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dotClass}`} />
                              <span className="truncate">{iv.candidateName}</span>
                            </div>
                            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        );
                      })}
                      {dayInterviews.length > 3 && (
                        <span className="block text-center text-[10px] font-bold text-[var(--text-secondary)] hover:text-[#6D28D9] transition-colors py-0.5 cursor-default">
                          +{dayInterviews.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-[var(--border)] bg-[var(--surface-subtle)]/50 text-xs font-semibold text-[var(--text-secondary)]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">Status Legend:</span>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
                <span>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
