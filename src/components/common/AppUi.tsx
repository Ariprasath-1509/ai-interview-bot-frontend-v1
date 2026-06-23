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
  blue: "border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 hover:border-l-blue-400 dark:from-blue-500/10 dark:to-cyan-500/5",
  indigo: "border-l-indigo-500 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 hover:border-l-indigo-400 dark:from-indigo-500/10 dark:to-violet-500/5",
  purple: "border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 hover:border-l-purple-400 dark:from-purple-500/10 dark:to-fuchsia-500/5",
  teal: "border-l-teal-500 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 hover:border-l-teal-400 dark:from-teal-500/10 dark:to-cyan-500/5",
  amber: "border-l-amber-500 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:border-l-amber-400 dark:from-amber-500/10 dark:to-orange-500/5",
  emerald: "border-l-emerald-500 bg-gradient-to-br from-emerald-500/5 to-green-500/5 hover:border-l-emerald-400 dark:from-emerald-500/10 dark:to-green-500/5",
  green: "border-l-emerald-500 bg-gradient-to-br from-emerald-500/5 to-lime-500/5 hover:border-l-emerald-400 dark:from-emerald-500/10 dark:to-lime-500/5",
  yellow: "border-l-yellow-500 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 hover:border-l-yellow-400 dark:from-yellow-500/10 dark:to-amber-500/5",
  rose: "border-l-rose-500 bg-gradient-to-br from-rose-500/5 to-pink-500/5 hover:border-l-rose-400 dark:from-rose-500/10 dark:to-pink-500/5",
};

const ACCENT_ICON: Record<AccentColor, string> = {
  blue: "bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-md shadow-blue-500/20",
  indigo: "bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-md shadow-indigo-500/20",
  purple: "bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white shadow-md shadow-purple-500/20",
  teal: "bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-md shadow-teal-500/20",
  amber: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20",
  emerald: "bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-md shadow-emerald-500/20",
  green: "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-500/20",
  yellow: "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-500/20",
  rose: "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-500/20",
};

const ACCENT_LINK: Record<AccentColor, string> = {
  blue: "border-l-blue-500 hover:border-blue-400 hover:shadow-blue-500/5",
  indigo: "border-l-indigo-500 hover:border-indigo-400 hover:shadow-indigo-500/5",
  purple: "border-l-purple-500 hover:border-purple-400 hover:shadow-purple-500/5",
  teal: "border-l-teal-500 hover:border-teal-400 hover:shadow-teal-500/5",
  amber: "border-l-amber-500 hover:border-amber-400 hover:shadow-amber-500/5",
  emerald: "border-l-emerald-500 hover:border-emerald-400 hover:shadow-emerald-500/5",
  green: "border-l-emerald-500 hover:border-emerald-400 hover:shadow-emerald-500/5",
  yellow: "border-l-yellow-500 hover:border-yellow-400 hover:shadow-yellow-500/5",
  rose: "border-l-rose-500 hover:border-rose-400 hover:shadow-rose-500/5",
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
  blue: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
  indigo: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
  purple: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
  teal: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
  amber: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  emerald: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  green: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  yellow: "group-hover:text-yellow-600 dark:group-hover:text-yellow-400",
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
      className={`stat-card h-full transition-all duration-350 ${ACCENT_STAT[accent]} ${
        linkTo ? "cursor-pointer hover:scale-[1.015] hover:shadow-lg" : ""
      }`}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${ACCENT_ICON[accent]}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
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
        </div>
        <div className={Icon ? "mt-4 pl-[52px]" : "mt-4"}>
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
  const gradients: Record<HeroVariant, string> = {
    blue: "from-blue-500/90 via-blue-600/90 to-cyan-600/90 border-blue-400/20 dark:border-blue-900/10",
    indigo: "from-indigo-500/90 via-violet-600/90 to-purple-700/90 border-indigo-400/20 dark:border-indigo-900/10",
    purple: "from-purple-500/90 via-fuchsia-600/90 to-pink-600/90 border-purple-400/20 dark:border-purple-900/10",
    teal: "from-teal-500/90 via-cyan-600/90 to-blue-600/90 border-teal-400/20 dark:border-teal-900/10",
    emerald: "from-emerald-500/90 via-green-600/90 to-teal-600/90 border-emerald-400/20 dark:border-emerald-900/10",
    amber: "from-amber-500/90 via-orange-500/90 to-red-500/90 border-amber-400/20 dark:border-amber-900/10",
    rose: "from-rose-500/90 via-pink-600/90 to-fuchsia-600/90 border-rose-400/20 dark:border-rose-900/10",
    sunset: "from-violet-600/90 via-fuchsia-600/90 to-orange-500/90 border-violet-400/20 dark:border-violet-900/10",
    ocean: "from-cyan-500/90 via-blue-600/90 to-indigo-700/90 border-cyan-400/20 dark:border-cyan-900/10",
  };

  return (
    <div
      className={`page-hero border bg-gradient-to-br ${gradients[variant]} text-white backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5`}
    >
      <div className="relative flex items-start gap-4 z-10">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-lg backdrop-blur-md ring-1 ring-white/20">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold tracking-tight drop-shadow-sm">{title}</h2>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/90 font-medium">
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
    <div className="mb-4">
      <h2 className="section-label">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{description}</p>
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
