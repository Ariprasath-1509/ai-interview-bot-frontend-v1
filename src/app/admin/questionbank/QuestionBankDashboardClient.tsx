"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, Tag, Building2, Package, FileText, Settings, Mail, Users, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonCard } from "@/components/common/Skeleton";

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
  { href: "/admin/questionbank/categories", label: "Categories", icon: Layers, desc: "Manage classification categories for AI digest constraint." },
  { href: "/admin/questionbank/tags", label: "Tags", icon: Tag, desc: "Review and delete unused auto-generated tags." },
  { href: "/admin/questionbank/companies", label: "Companies", icon: Building2, desc: "Manage company directory manually." },
  { href: "/admin/questionbank/sessions", label: "Sessions", icon: Package, desc: "View and clean up interview session data." },
  { href: "/admin/questionbank/questions", label: "Digest Ingestion", icon: FileText, desc: "Feed raw interview strings into the AI engine." },
  { href: "/admin/questionbank/manage", label: "Manage Questions", icon: Settings, desc: "Search, edit, and curate individual questions." },
  { href: "/admin/questionbank/emails", label: "Email Notifications", icon: Mail, desc: "Send hand-picked questions to candidates via email." },
  { href: "/admin/questionbank/users", label: "Users", icon: Users, desc: "View registered candidate details." },
];

export default function QuestionBankDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/questionbank/admin/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stats Widget */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">TOTAL QUESTIONS</div>
                <div className="text-3xl font-bold text-primary">{stats.totalQuestions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">COMPANIES</div>
                <div className="text-3xl font-bold text-primary">{stats.totalCompanies}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">SESSIONS</div>
                <div className="text-3xl font-bold text-primary">{stats.totalSessions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">CANDIDATES</div>
                <div className="text-3xl font-bold text-primary">{stats.totalCandidates}</div>
              </CardContent>
            </Card>
          </div>

          {/* Questions by Importance */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-4">QUESTIONS BY IMPORTANCE</div>
              <div className="flex justify-around">
                <div className="text-center">
                  <span className="inline-block rounded border border-red-500 px-3 py-1 text-sm text-red-500">CRITICAL</span>
                  <p className="mt-2 text-2xl font-bold">{stats.questionsByImportance.CRITICAL}</p>
                </div>
                <div className="text-center">
                  <span className="inline-block rounded border border-orange-500 px-3 py-1 text-sm text-orange-500">HIGH</span>
                  <p className="mt-2 text-2xl font-bold">{stats.questionsByImportance.HIGH}</p>
                </div>
                <div className="text-center">
                  <span className="inline-block rounded border border-yellow-500 px-3 py-1 text-sm text-yellow-500">MODERATE</span>
                  <p className="mt-2 text-2xl font-bold">{stats.questionsByImportance.MODERATE}</p>
                </div>
                <div className="text-center">
                  <span className="inline-block rounded border border-green-500 px-3 py-1 text-sm text-green-500">LOW</span>
                  <p className="mt-2 text-2xl font-bold">{stats.questionsByImportance.LOW}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Modules */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Control Modules</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link key={module.href} href={module.href}>
                    <Card className="hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{module.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{module.desc}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            {stats.lastDigestDate && (
              <p className="mt-4 text-sm text-muted-foreground">
                LAST DIGEST RUN: {new Date(stats.lastDigestDate).toLocaleString()}
              </p>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Unable to load statistics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}