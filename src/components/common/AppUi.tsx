"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
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
  blue: "border-l-blue-500 bg-gradient-to-br from-blue-50/90 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/15",
  indigo: "border-l-indigo-500 bg-gradient-to-br from-indigo-50/90 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/15",
  purple: "border-l-purple-500 bg-gradient-to-br from-purple-50/90 to-fuchsia-50/50 dark:from-purple-950/30 dark:to-fuchsia-950/15",
  teal: "border-l-teal-500 bg-gradient-to-br from-teal-50/90 to-cyan-50/50 dark:from-teal-950/30 dark:to-cyan-950/15",
  amber: "border-l-amber-500 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/15",
  emerald: "border-l-emerald-500 bg-gradient-to-br from-emerald-50/90 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/15",
  green: "border-l-emerald-500 bg-gradient-to-br from-emerald-50/90 to-lime-50/50 dark:from-emerald-950/30 dark:to-lime-950/15",
  yellow: "border-l-yellow-500 bg-gradient-to-br from-yellow-50/90 to-amber-50/50 dark:from-yellow-950/30 dark:to-amber-950/15",
  rose: "border-l-rose-500 bg-gradient-to-br from-rose-50/90 to-pink-50/50 dark:from-rose-950/30 dark:to-pink-950/15",
};

const ACCENT_ICON: Record<AccentColor, string> = {
  blue: "bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-md shadow-blue-500/30",
  indigo: "bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-md shadow-indigo-500/30",
  purple: "bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white shadow-md shadow-purple-500/30",
  teal: "bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-md shadow-teal-500/30",
  amber: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30",
  emerald: "bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-md shadow-emerald-500/30",
  green: "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-500/30",
  yellow: "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-500/30",
  rose: "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-500/30",
};

const ACCENT_LINK: Record<AccentColor, string> = {
  blue: "border-l-blue-500 hover:border-blue-400 hover:shadow-blue-500/10",
  indigo: "border-l-indigo-500 hover:border-indigo-400 hover:shadow-indigo-500/10",
  purple: "border-l-purple-500 hover:border-purple-400 hover:shadow-purple-500/10",
  teal: "border-l-teal-500 hover:border-teal-400 hover:shadow-teal-500/10",
  amber: "border-l-amber-500 hover:border-amber-400 hover:shadow-amber-500/10",
  emerald: "border-l-emerald-500 hover:border-emerald-400 hover:shadow-emerald-500/10",
  green: "border-l-emerald-500 hover:border-emerald-400 hover:shadow-emerald-500/10",
  yellow: "border-l-yellow-500 hover:border-yellow-400 hover:shadow-yellow-500/10",
  rose: "border-l-rose-500 hover:border-rose-400 hover:shadow-rose-500/10",
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  purple: "text-purple-600 dark:text-purple-400",
  teal: "text-teal-600 dark:text-teal-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  green: "text-emerald-600 dark:text-emerald-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  rose: "text-rose-600 dark:text-rose-400",
};

const ACCENT_HOVER_TEXT: Record<AccentColor, string> = {
  blue: "group-hover:text-blue-700 dark:group-hover:text-blue-300",
  indigo: "group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
  purple: "group-hover:text-purple-700 dark:group-hover:text-purple-300",
  teal: "group-hover:text-teal-700 dark:group-hover:text-teal-300",
  amber: "group-hover:text-amber-700 dark:group-hover:text-amber-300",
  emerald: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
  green: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
  yellow: "group-hover:text-yellow-700 dark:group-hover:text-yellow-300",
  rose: "group-hover:text-rose-700 dark:group-hover:text-rose-300",
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
  yellow: "border-l-yellow-500",
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
        linkTo ? "cursor-pointer hover:shadow-xl" : ""
      }`}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ACCENT_ICON[accent]}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
              {title}
            </p>
            {description && (
              <p className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className={Icon ? "mt-4 pl-[52px]" : "mt-4"}>
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
          {linkTo && (
            <p className={`mt-2 text-xs font-medium ${ACCENT_TEXT[accent]}`}>
              View details →
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="block h-full">
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
  const gradients: Record<HeroVariant, string> = {
    blue: "from-blue-500 via-blue-600 to-cyan-600 border-blue-300/50 dark:border-blue-800/40",
    indigo: "from-indigo-500 via-violet-600 to-purple-700 border-indigo-300/50 dark:border-indigo-800/40",
    purple: "from-purple-500 via-fuchsia-600 to-pink-600 border-purple-300/50 dark:border-purple-800/40",
    teal: "from-teal-500 via-cyan-600 to-blue-600 border-teal-300/50 dark:border-teal-800/40",
    emerald: "from-emerald-500 via-green-600 to-teal-600 border-emerald-300/50 dark:border-emerald-800/40",
    amber: "from-amber-500 via-orange-500 to-red-500 border-amber-300/50 dark:border-amber-800/40",
    rose: "from-rose-500 via-pink-600 to-fuchsia-600 border-rose-300/50 dark:border-rose-800/40",
    sunset: "from-violet-600 via-fuchsia-600 to-orange-500 border-violet-300/50 dark:border-violet-800/40",
    ocean: "from-cyan-500 via-blue-600 to-indigo-700 border-cyan-300/50 dark:border-cyan-800/40",
  };

  return (
    <div
      className={`page-hero bg-gradient-to-br ${gradients[variant]} text-white`}
    >
      <div className="relative flex items-start gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm ring-1 ring-white/30">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold tracking-tight drop-shadow-sm">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/90">
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
    <Link href={href} className="block h-full">
      <div
        className={`quick-link-card group h-full border-l-4 ${ACCENT_LINK[accent]}`}
      >
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT_ICON[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p
              className={`font-semibold text-zinc-900 dark:text-zinc-100 ${ACCENT_HOVER_TEXT[accent]}`}
            >
              {label}
            </p>
            <p className="mt-1 text-sm leading-snug text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
            <p className={`mt-2 text-xs font-medium ${ACCENT_TEXT[accent]}`}>
              Open →
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
    <div className={`panel-card border-l-4 ${PANEL_BORDER[accent]}`}>
      {(title || actions) && (
        <div
          className={`panel-header flex items-center justify-between gap-3 ${PANEL_HEADER_ACCENT[accent]}`}
        >
          {title && (
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {Icon && <Icon className={`h-4 w-4 ${ACCENT_TEXT[accent]}`} />}
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
    <div className="mb-4">
      <h2 className="section-label">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
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
    info: "border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-900 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-violet-950/20 dark:text-indigo-200",
    warning:
      "border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-orange-50/70 text-amber-900 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20 dark:text-amber-200",
    success:
      "border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 text-emerald-900 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20 dark:text-emerald-200",
  };
  return (
    <div className={`rounded-lg border px-4 py-2.5 text-sm shadow-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
