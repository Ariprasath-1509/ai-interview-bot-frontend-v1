"use client";

import Link from "next/link";
import { UserCheck, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

type Profile = {
  name?: string | null;
  contactNumber?: string | null;
  officialEmail?: string | null;
  personalEmail?: string | null;
  batch?: string | null;
  source?: string | null;
  skillSet?: string | null;
  yoePortrayed?: number | null;
  yop?: number | null;
};

export function ProfileCompletionCard({ profile }: { profile: Profile }) {
  const fields = [
    { label: "Name", filled: !!profile.name },
    { label: "Contact", filled: !!profile.contactNumber },
    { label: "Official Email", filled: !!profile.officialEmail },
    { label: "Personal Email", filled: !!profile.personalEmail },
    { label: "Batch", filled: !!profile.batch },
    { label: "Source", filled: !!profile.source },
    { label: "Skill Set", filled: !!profile.skillSet },
    { label: "YOE", filled: profile.yoePortrayed != null },
    { label: "Year of Passing", filled: profile.yop != null },
  ];

  const filled = fields.filter((f) => f.filled).length;
  const pct = Math.round((filled / fields.length) * 100);
  const missing = fields.filter((f) => !f.filled);

  return (
    <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-purple-300/40 flex flex-col justify-between">
      <div>
        <div className="panel-header panel-header-accent-purple flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Profile Readiness</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
              pct === 100
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : pct >= 70
                ? "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            {pct}%
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)] border border-[var(--border)]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct === 100
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : pct >= 70
                  ? "bg-gradient-to-r from-purple-600 to-indigo-500"
                  : "bg-gradient-to-r from-amber-500 to-orange-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {missing.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Missing: <span className="text-[var(--text-primary)] font-bold">{missing.map((m) => m.label).join(", ")}</span>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pt-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>All candidate attributes filled!</span>
            </div>
          )}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="px-4 pb-4">
          <Link
            href="/candidate/profile"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 py-1.5 text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
          >
            Complete Profile
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
