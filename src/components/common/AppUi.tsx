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
  blue: "border-l-blue-500 bg-blue-50/80 dark:bg-blue-950/20",
  indigo: "border-l-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/20",
  purple: "border-l-purple-500 bg-purple-50/80 dark:bg-purple-950/20",
  teal: "border-l-teal-500 bg-teal-50/80 dark:bg-teal-950/20",
  amber: "border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/20",
  emerald: "border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20",
  green: "border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20",
  yellow: "border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/20",
  rose: "border-l-rose-500 bg-rose-50/80 dark:bg-rose-950/20",
};

const ACCENT_ICON: Record<AccentColor, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const ACCENT_LINK: Record<AccentColor, string> = {
  blue: "border-l-blue-500 hover:border-blue-300 dark:hover:border-blue-700",
  indigo: "border-l-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700",
  purple: "border-l-purple-500 hover:border-purple-300 dark:hover:border-purple-700",
  teal: "border-l-teal-500 hover:border-teal-300 dark:hover:border-teal-700",
  amber: "border-l-amber-500 hover:border-amber-300 dark:hover:border-amber-700",
  emerald: "border-l-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700",
  green: "border-l-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700",
  yellow: "border-l-amber-500 hover:border-amber-300 dark:hover:border-amber-700",
  rose: "border-l-rose-500 hover:border-rose-300 dark:hover:border-rose-700",
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
        linkTo ? "cursor-pointer hover:shadow-md" : ""
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
            <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
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

export function PageHero({
  title,
  description,
  icon: Icon,
  variant = "blue",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: "blue" | "indigo" | "purple" | "teal";
}) {
  const gradients = {
    blue: "from-blue-600 via-blue-700 to-indigo-800 border-blue-200/80 dark:border-blue-900/40",
    indigo: "from-indigo-600 via-indigo-700 to-purple-800 border-indigo-200/80 dark:border-indigo-900/40",
    purple: "from-purple-600 via-purple-700 to-indigo-800 border-purple-200/80 dark:border-purple-900/40",
    teal: "from-teal-600 via-teal-700 to-cyan-800 border-teal-200/80 dark:border-teal-900/40",
  };

  return (
    <div
      className={`page-hero bg-gradient-to-br ${gradients[variant]} text-white`}
    >
      <div className="relative flex items-start gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/85">
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
            <p className="font-semibold text-zinc-900 group-hover:text-blue-700 dark:text-zinc-100 dark:group-hover:text-blue-300">
              {label}
            </p>
            <p className="mt-1 text-sm leading-snug text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
            <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
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
  const headerAccent: Record<AccentColor, string> = {
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

  return (
    <div className={`panel-card border-l-4 ${headerAccent[accent]}`}>
      {(title || actions) && (
        <div className="panel-header flex items-center justify-between gap-3">
          {title && (
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {Icon && (
                <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
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
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
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
    info: "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200",
    warning:
      "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200",
    success:
      "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200",
  };
  return (
    <div className={`rounded-lg border px-4 py-2.5 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
