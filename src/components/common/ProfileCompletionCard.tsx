"use client";

import Link from "next/link";

type Profile = {
  name?: string | null;
  contactNumber?: string | null;
  officialEmail?: string | null;
  personalEmail?: string | null;
  batch?: string | null;
  source?: string | null;
  skillSet?: string | null;
  yoeActual?: number | null;
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
    { label: "YOE Actual", filled: profile.yoeActual != null },
    { label: "YOE Portrayed", filled: profile.yoePortrayed != null },
    { label: "Year of Passing", filled: profile.yop != null },
  ];

  const filled = fields.filter((f) => f.filled).length;
  const pct = Math.round((filled / fields.length) * 100);
  const missing = fields.filter((f) => !f.filled);

  return (
    <div className="rounded-2xl border border-white/20 bg-white/70 p-5 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Profile Completion</h3>
        <span className={`text-sm font-bold ${pct === 100 ? "text-emerald-600" : pct >= 70 ? "text-blue-600" : "text-amber-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="w-full rounded-full bg-zinc-200 dark:bg-zinc-800 h-2.5 mb-3">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : "bg-amber-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {missing.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Missing: {missing.map((m) => m.label).join(", ")}</p>
          <Link href="/candidate/profile" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
            Complete your profile →
          </Link>
        </div>
      ) : (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Profile complete</p>
      )}
    </div>
  );
}
