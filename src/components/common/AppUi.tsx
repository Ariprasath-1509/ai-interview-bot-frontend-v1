"use client";

import Link from "next/link";
import { Clock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AccentColor =
  | "blue"
  | "indigo"
  | "purple"
  | "teal"
  | "amber"
  | "emerald"
  | "green"
  | "yellow"
  | "rose";

const ACCENT_STAT: Record<AccentColor, string> = {
  blue: "border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-blue-500/15 dark:to-cyan-500/5",
  indigo: "border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-indigo-500/15 dark:to-violet-500/5",
  purple: "border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-purple-500/15 dark:to-fuchsia-500/5",
  teal: "border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-teal-500/15 dark:to-cyan-500/5",
  amber: "border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-amber-500/15 dark:to-orange-500/5",
  emerald: "border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-emerald-500/15 dark:to-green-500/5",
  green: "border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-lime-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-emerald-500/15 dark:to-lime-500/5",
  yellow: "border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-yellow-500/15 dark:to-amber-500/5",
  rose: "border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:from-rose-500/15 dark:to-pink-500/5",
};


const ACCENT_ICON: Record<AccentColor, string> = {
  blue: "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-500/25",
  indigo: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25",
  purple: "bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-md shadow-purple-500/25",
  teal: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25",
  amber: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25",
  emerald: "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/25",
  green: "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/25",
  yellow: "bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25",
  rose: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25",
};

const ACCENT_LINK: Record<AccentColor, string> = {
  blue: "hover:border-blue-500/40 hover:shadow-blue-500/5",
  indigo: "hover:border-indigo-500/40 hover:shadow-indigo-500/5",
  purple: "hover:border-purple-500/40 hover:shadow-purple-500/5",
  teal: "hover:border-teal-500/40 hover:shadow-teal-500/5",
  amber: "hover:border-amber-500/40 hover:shadow-amber-500/5",
  emerald: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
  green: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
  yellow: "hover:border-amber-500/40 hover:shadow-amber-500/5",
  rose: "hover:border-rose-500/40 hover:shadow-rose-500/5",
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  purple: "text-purple-600 dark:text-purple-400",
  teal: "text-teal-600 dark:text-teal-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  green: "text-emerald-600 dark:text-emerald-400",
  yellow: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
};

const ACCENT_HOVER_TEXT: Record<AccentColor, string> = {
  blue: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
  indigo: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
  purple: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
  teal: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
  amber: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  emerald: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  green: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  yellow: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  rose: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
};

const PANEL_HEADER_ACCENT: Record<AccentColor, string> = {
  blue: "panel-header-accent-blue",
  indigo: "panel-header-accent-indigo",
  purple: "panel-header-accent-purple",
  teal: "panel-header-accent-teal",
  amber: "panel-header-accent-amber",
  emerald: "panel-header-accent-emerald",
  green: "panel-header-accent-green",
  yellow: "panel-header-accent-yellow",
  rose: "panel-header-accent-rose",
};

const PANEL_BORDER: Record<AccentColor, string> = {
  blue: "border-l-blue-500",
  indigo: "border-l-indigo-500",
  purple: "border-l-purple-500",
  teal: "border-l-teal-500",
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
  green: "border-l-emerald-500",
  yellow: "border-l-amber-500",
  rose: "border-l-rose-500",
};

export function StatCard({
  title,
  description,
  value,
  accent = "blue",
  subtitle,
  linkTo,
  icon: Icon,
}: {
  title: string;
  description?: string;
  value: number | string;
  accent?: AccentColor;
  subtitle?: string;
  linkTo?: string;
  icon?: LucideIcon;
}) {
  const content = (
    <div
      className={`stat-card h-full ${ACCENT_STAT[accent]} ${
        linkTo ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold leading-snug text-zinc-800 dark:text-zinc-200">
              {title}
            </p>
            {description && (
              <p className="mt-1 text-xs leading-snug text-zinc-400 dark:text-zinc-500">
                {description}
              </p>
            )}
          </div>
          {Icon && (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${ACCENT_ICON[accent]}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{subtitle}</p>
          )}
          {linkTo && (
            <p className={`mt-2 text-xs font-semibold flex items-center gap-1 ${ACCENT_TEXT[accent]}`}>
              View details <span>→</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="block h-full group">
        {content}
      </Link>
    );
  }
  return content;
}



export type HeroVariant =
  | "blue"
  | "indigo"
  | "purple"
  | "teal"
  | "emerald"
  | "amber"
  | "rose"
  | "sunset"
  | "ocean";

export function PageHero({
  title,
  description,
  icon: Icon,
  variant = "sunset",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: HeroVariant;
}) {
  return (
    <div
      className="page-hero border border-zinc-200/80 bg-white/60 p-6 backdrop-blur-md rounded-2xl shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/25 text-zinc-900 dark:text-zinc-50"
    >
      <div className="relative flex items-center gap-4 z-10">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shadow-sm transition-transform duration-300 hover:scale-105">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickLinkCard({
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
  accent?: AccentColor;
}) {
  return (
    <Link href={href} className="block h-full group">
      <div
        className={`quick-link-card h-full border-l-4 transition-all duration-300 hover:scale-[1.015] hover:shadow-lg ${ACCENT_LINK[accent]}`}
      >
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${ACCENT_ICON[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p
              className={`font-semibold text-[15px] text-zinc-850 dark:text-zinc-100 ${ACCENT_HOVER_TEXT[accent]}`}
            >
              {label}
            </p>
            <p className="mt-1 text-sm leading-snug text-zinc-400 dark:text-zinc-500">
              {description}
            </p>
            <p className={`mt-2 text-xs font-semibold flex items-center gap-1 ${ACCENT_TEXT[accent]}`}>
              Open <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PanelCard({
  title,
  icon: Icon,
  actions,
  children,
  accent = "blue",
}: {
  title?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  accent?: AccentColor;
}) {
  return (
    <div className={`panel-card border-l-4 transition-shadow hover:shadow-lg duration-300 ${PANEL_BORDER[accent]}`}>
      {(title || actions) && (
        <div
          className={`panel-header flex items-center justify-between gap-3 ${PANEL_HEADER_ACCENT[accent]}`}
        >
          {title && (
            <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
              {Icon && <Icon className={`h-4.5 w-4.5 ${ACCENT_TEXT[accent]}`} />}
              {title}
            </h3>
          )}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-purple-500/5 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-300 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
        {title}
      </span>
      {description && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)]/70 px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs">
          <Clock size={12} className="text-purple-500 opacity-80" />
          {description}
        </span>
      )}
    </div>
  );
}

export function InfoBanner({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "warning" | "success";
}) {
  const styles = {
    info: "border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/30 text-indigo-900 dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-violet-950/10 dark:text-indigo-200",
    warning:
      "border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/30 text-amber-900 dark:border-amber-900/30 dark:from-amber-950/20 dark:to-orange-950/10 dark:text-amber-200",
    success:
      "border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 text-emerald-900 dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-teal-950/10 dark:text-emerald-200",
  };
  return (
    <div className={`rounded-lg border px-4 py-2.5 text-sm shadow-sm transition-shadow duration-300 hover:shadow-md ${styles[variant]}`}>
      {children}
    </div>
  );
};
