"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Database, Loader2, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export type MasterDataAccent = "blue" | "indigo" | "purple" | "teal" | "amber" | "emerald";

const ACCENT: Record<
  MasterDataAccent,
  { statBg: string; statBorder: string; iconBg: string; linkBorder: string; badge: string }
> = {
  blue: {
    statBg: "from-blue-500/10 via-indigo-500/5 to-transparent",
    statBorder: "border-blue-500/30 hover:border-blue-500/60",
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    linkBorder: "hover:border-blue-500/40 hover:shadow-blue-500/5",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20",
  },
  indigo: {
    statBg: "from-indigo-500/10 via-purple-500/5 to-transparent",
    statBorder: "border-indigo-500/30 hover:border-indigo-500/60",
    iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    linkBorder: "hover:border-indigo-500/40 hover:shadow-indigo-500/5",
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20",
  },
  purple: {
    statBg: "from-purple-500/10 via-fuchsia-500/5 to-transparent",
    statBorder: "border-purple-500/30 hover:border-purple-500/60",
    iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    linkBorder: "hover:border-purple-500/40 hover:shadow-purple-500/5",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20",
  },
  teal: {
    statBg: "from-teal-500/10 via-emerald-500/5 to-transparent",
    statBorder: "border-teal-500/30 hover:border-teal-500/60",
    iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    linkBorder: "hover:border-teal-500/40 hover:shadow-teal-500/5",
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20",
  },
  amber: {
    statBg: "from-amber-500/10 via-orange-500/5 to-transparent",
    statBorder: "border-amber-500/30 hover:border-amber-500/60",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    linkBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
  },
  emerald: {
    statBg: "from-emerald-500/10 via-teal-500/5 to-transparent",
    statBorder: "border-emerald-500/30 hover:border-emerald-500/60",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    linkBorder: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
  },
};

export function MasterDataBackLink() {
  return (
    <Link
      href="/admin/master-data"
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Master Data
    </Link>
  );
}

export function MasterDataHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/90 via-purple-900/80 to-slate-900/90 p-6 text-white shadow-lg backdrop-blur-sm">
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-inner">
            <Database className="h-6 w-6 text-indigo-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Master Data Configuration Hub
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sync Enabled
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-indigo-100/90 font-medium">
              Centralized platform repository for lookup values, question bank categories, tags, and enterprise company directories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MasterDataStatCard({
  label,
  value,
  accent = "blue",
  icon: Icon,
}: {
  label: string;
  value: number | string;
  accent?: MasterDataAccent;
  icon?: LucideIcon;
}) {
  const style = ACCENT[accent] || ACCENT.blue;
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br ${style.statBg} bg-[var(--surface)] p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.statBorder}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-[var(--text-primary)] tracking-tight">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${style.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function MasterDataQuickLink({
  href,
  label,
  description,
  icon: Icon,
  accent = "blue",
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent?: MasterDataAccent;
}) {
  const style = ACCENT[accent] || ACCENT.blue;
  return (
    <Link href={href} className="block h-full">
      <div className={`group relative h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.linkBorder}`}>
        <div className="flex gap-4 items-start">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-105 ${style.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-base text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {label}
              </p>
              <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 group-hover:translate-x-0.5 ${style.badge}`}>
                Manage
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)] font-medium">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MasterDataFormCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="master-data-form-card">
      <div className="border-b border-blue-100 px-5 py-4 dark:border-blue-900/30">
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {Icon && <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function MasterDataListCard({
  title,
  icon: Icon,
  count,
  children,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  count?: number;
  children: ReactNode;
  empty?: ReactNode;
}) {
  const isEmpty = count === 0;

  return (
    <div className="master-data-list-card">
      <div className="master-data-list-header">
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
          {count != null && (
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              ({count})
            </span>
          )}
        </h3>
      </div>
      <div className="p-5">
        {isEmpty && empty ? empty : children}
      </div>
    </div>
  );
}

export function MasterDataLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

export function MasterDataEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <Icon className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
    </div>
  );
}

export function MasterDataSectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="section-label">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
    </div>
  );
}

export const STATUS_BADGE = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  inactive:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
} as const;

export const TYPE_BADGE: Record<string, string> = {
  backend: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  frontend: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  shared: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
