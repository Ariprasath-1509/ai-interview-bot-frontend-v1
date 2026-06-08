"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Database, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export type MasterDataAccent = "blue" | "indigo" | "purple" | "teal" | "amber" | "emerald";

const ACCENT: Record<
  MasterDataAccent,
  { stat: string; icon: string; link: string }
> = {
  blue: {
    stat: "border-l-blue-500 bg-blue-50/80 dark:bg-blue-950/20",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    link: "border-l-blue-500 hover:border-blue-300 dark:hover:border-blue-700",
  },
  indigo: {
    stat: "border-l-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/20",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    link: "border-l-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700",
  },
  purple: {
    stat: "border-l-purple-500 bg-purple-50/80 dark:bg-purple-950/20",
    icon: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    link: "border-l-purple-500 hover:border-purple-300 dark:hover:border-purple-700",
  },
  teal: {
    stat: "border-l-teal-500 bg-teal-50/80 dark:bg-teal-950/20",
    icon: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    link: "border-l-teal-500 hover:border-teal-300 dark:hover:border-teal-700",
  },
  amber: {
    stat: "border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    link: "border-l-amber-500 hover:border-amber-300 dark:hover:border-amber-700",
  },
  emerald: {
    stat: "border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    link: "border-l-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700",
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
    <div className="master-data-hero mb-2">
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Configuration Hub
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-blue-100">
            Manage lookup values, question bank categories, tags, and companies from one place —
            no code deploys required.
          </p>
        </div>
      </div>
    </div>
  );
}

export function MasterDataStatCard({
  label,
  value,
  accent = "blue",
}: {
  label: string;
  value: number | string;
  accent?: MasterDataAccent;
}) {
  return (
    <div className={`master-data-stat ${ACCENT[accent].stat}`}>
      <p className="section-label text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
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
  return (
    <Link href={href} className="block h-full">
      <div
        className={`card group h-full border-l-4 p-5 transition-all duration-200 hover:shadow-md ${ACCENT[accent].link}`}
      >
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT[accent].icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 group-hover:text-blue-700 dark:text-zinc-100 dark:group-hover:text-blue-300">
              {label}
            </p>
            <p className="mt-1 text-sm leading-snug text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
            <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              Manage →
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
