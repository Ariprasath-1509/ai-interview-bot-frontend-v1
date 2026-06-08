"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { SkeletonCard } from "@/components/common/Skeleton";
import { PageHero, QuickLinkCard, SectionHeader, StatCard } from "@/components/common/AppUi";

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
];

const IMPORTANCE_STYLES = {
  CRITICAL: "border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
  HIGH: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300",
  MODERATE: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
  LOW: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="empty-state">
        <Database className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
        <p className="font-medium text-zinc-700 dark:text-zinc-300">Unable to load statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      <PageHero
        icon={Database}
        title="Question Bank"
        description="Ingest interviews, curate questions, and manage categories, tags, and companies."
        variant="purple"
      />

      <div>
        <SectionHeader title="At a glance" description="Question bank inventory summary" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Questions" value={stats.totalQuestions} accent="blue" icon={FileText} />
          <StatCard title="Companies" value={stats.totalCompanies} accent="amber" icon={Building2} />
          <StatCard title="Sessions" value={stats.totalSessions} accent="indigo" icon={Package} />
          <StatCard title="Candidates" value={stats.totalCandidates} accent="teal" icon={Users} />
        </div>
      </div>

      <div className="panel-card border-l-4 border-l-purple-500">
        <div className="panel-header">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Questions by importance
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {(Object.keys(stats.questionsByImportance) as Array<keyof typeof stats.questionsByImportance>).map(
            (key) => (
              <div key={key} className="text-center">
                <span
                  className={`inline-block rounded-lg border px-3 py-1 text-xs font-semibold uppercase ${IMPORTANCE_STYLES[key]}`}
                >
                  {key}
                </span>
                <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {stats.questionsByImportance[key]}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="Control modules" description="Manage question bank data and workflows" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <QuickLinkCard
              key={module.href}
              href={module.href}
              label={module.label}
              description={module.desc}
              icon={module.icon}
              accent={module.accent}
            />
          ))}
        </div>
        {stats.lastDigestDate && (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Last digest run: {new Date(stats.lastDigestDate).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
