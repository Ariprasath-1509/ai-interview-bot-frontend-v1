"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Tag,
  Building2,
  Package,
  FileText,
  Settings,
  Mail,
  Users,
  Database,
  BarChart2,
  Sparkles,
  Sliders,
  BarChart3,
  Flame,
  Clock,
  ArrowRight,
} from "lucide-react";
import { SkeletonCard } from "@/components/common/Skeleton";
import { MasterDataStatCard } from "@/components/admin/master-data/MasterDataUi";

interface AdminStats {
  totalQuestions: number;
  totalCompanies: number;
  totalSessions: number;
  totalCandidates: number;
  questionsByImportance: {
    CRITICAL: number;
    HIGH: number;
    MODERATE: number;
    LOW: number;
  };
  lastDigestDate: string | null;
}

const modules = [
  { href: "/admin/questionbank/categories", label: "Categories", icon: Layers, desc: "Manage classification categories for AI digest.", accent: "purple" as const },
  { href: "/admin/questionbank/tags", label: "Tags", icon: Tag, desc: "Review and delete unused auto-generated tags.", accent: "teal" as const },
  { href: "/admin/questionbank/companies", label: "Companies", icon: Building2, desc: "Manage company directory manually.", accent: "amber" as const },
  { href: "/admin/questionbank/sessions", label: "Sessions", icon: Package, desc: "View and clean up interview session data.", accent: "indigo" as const },
  { href: "/admin/questionbank/questions", label: "Digest Ingestion", icon: FileText, desc: "Feed raw interview strings into the AI engine.", accent: "blue" as const },
  { href: "/admin/questionbank/manage", label: "Manage Questions", icon: Settings, desc: "Search, edit, and curate individual questions.", accent: "emerald" as const },
  { href: "/admin/questionbank/emails", label: "Email Notifications", icon: Mail, desc: "Send hand-picked questions to candidates.", accent: "rose" as const },
  { href: "/admin/questionbank/users", label: "Users", icon: Users, desc: "View registered candidate details.", accent: "indigo" as const },
  { href: "/admin/questionbank/analytics", label: "Analytics", icon: BarChart2, desc: "Trends, frequency, and distribution across the question bank.", accent: "emerald" as const },
];

const IMPORTANCE_STYLES = {
  CRITICAL: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20",
  HIGH: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20",
  MODERATE: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
};

const ACCENT_CARD_GRADIENTS: Record<string, {
  border: string;
  bg: string;
  iconBg: string;
  text: string;
}> = {
  purple: {
    border: "border-purple-500/20 hover:border-purple-500/50 hover:shadow-purple-500/10",
    bg: "bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent hover:from-purple-500/15 hover:to-purple-500/5",
    iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25",
    text: "text-purple-600 dark:text-purple-400",
  },
  teal: {
    border: "border-teal-500/20 hover:border-teal-500/50 hover:shadow-teal-500/10",
    bg: "bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent hover:from-teal-500/15 hover:to-teal-500/5",
    iconBg: "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25",
    text: "text-teal-600 dark:text-teal-400",
  },
  amber: {
    border: "border-amber-500/20 hover:border-amber-500/50 hover:shadow-amber-500/10",
    bg: "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/15 hover:to-amber-500/5",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25",
    text: "text-amber-600 dark:text-amber-400",
  },
  indigo: {
    border: "border-indigo-500/20 hover:border-indigo-500/50 hover:shadow-indigo-500/10",
    bg: "bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent hover:from-indigo-500/15 hover:to-indigo-500/5",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  blue: {
    border: "border-blue-500/20 hover:border-blue-500/50 hover:shadow-blue-500/10",
    bg: "bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:from-blue-500/15 hover:to-blue-500/5",
    iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-500/25",
    text: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    border: "border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    bg: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/15 hover:to-emerald-500/5",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  rose: {
    border: "border-rose-500/20 hover:border-rose-500/50 hover:shadow-rose-500/10",
    bg: "bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent hover:from-rose-500/15 hover:to-rose-500/5",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25",
    text: "text-rose-600 dark:text-rose-400",
  },
};

export default function QuestionBankDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/questionbank/admin/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="panel-card p-12 text-center">
        <Database className="mx-auto mb-3 h-10 w-10 text-[var(--text-secondary)] opacity-50" />
        <p className="font-bold text-[var(--text-primary)]">Unable to load statistics</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Glassmorphic Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-slate-900/90 p-6 text-white shadow-lg backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-inner">
              <Database className="h-6 w-6 text-purple-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Question Bank AI Engine
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">
                  <Sparkles className="h-3 w-3 text-purple-300" />
                  Digest Active
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-purple-100/90 font-medium">
                Ingest interview transcripts, curate questions, and manage categories, tags, and company interview directories.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* At a Glance Metrics Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/30">
        <div className="panel-header panel-header-accent-blue flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            At a Glance Inventory
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Question bank metrics summary
          </span>
        </div>
        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MasterDataStatCard label="Total Questions" value={stats.totalQuestions} accent="indigo" icon={FileText} />
            <MasterDataStatCard label="Companies" value={stats.totalCompanies} accent="amber" icon={Building2} />
            <MasterDataStatCard label="Sessions" value={stats.totalSessions} accent="purple" icon={Package} />
            <MasterDataStatCard label="Candidates" value={stats.totalCandidates} accent="teal" icon={Users} />
          </div>
        </div>
      </div>

      {/* Questions by Importance Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
        <div className="panel-header panel-header-accent-purple flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Flame className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Questions by Importance Level
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            AI Digest severity breakdown
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {(Object.keys(stats.questionsByImportance) as Array<keyof typeof stats.questionsByImportance>).map(
            (key) => (
              <div key={key} className="group flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs">
                <span
                  className={`inline-block rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider ${IMPORTANCE_STYLES[key]}`}
                >
                  {key}
                </span>
                <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-[var(--text-primary)]">
                  {stats.questionsByImportance[key]}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Control Modules Grid */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/30">
        <div className="panel-header panel-header-accent-indigo flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Sliders className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Control Modules
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Manage question bank data & workflows
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const IconComponent = module.icon;
              const style = ACCENT_CARD_GRADIENTS[module.accent] ?? ACCENT_CARD_GRADIENTS.indigo;

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-base text-[var(--text-primary)] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {module.label}
                      </h4>
                      <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
                        {module.desc}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${style.iconBg}`}
                    >
                      <IconComponent className="h-5.5 w-5.5" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-[var(--border)]/60 pt-3">
                    <span className={`text-xs font-extrabold flex items-center gap-1 ${style.text}`}>
                      Manage Module
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          {stats.lastDigestDate && (
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
              <Clock className="h-3.5 w-3.5 text-purple-500" />
              <span>Last digest run: {new Date(stats.lastDigestDate).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
