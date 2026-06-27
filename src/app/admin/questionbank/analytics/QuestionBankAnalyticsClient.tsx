"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Building2, Tag, FileText, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/common/Toast";
import { IMPORTANCE_COLORS } from "@/lib/questionbank-constants";

interface AdminStats {
  totalQuestions: number;
  totalCompanies: number;
  totalSessions: number;
  totalCandidates: number;
  questionsByImportance: { CRITICAL: number; HIGH: number; MODERATE: number; LOW: number };
  lastDigestDate: string | null;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
  sessionCount: number;
}

interface TagItem {
  id: string;
  name: string;
  questionCount?: number;
}

interface Question {
  id: string;
  text: string;
  category: string;
  occurrenceCount: number;
  relevancyLabel: string | null;
  askedByCompanies: string[];
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  interviewType?: string;
  questionCount: number;
}

const IMPORTANCE_ORDER = ["CRITICAL", "HIGH", "MODERATE", "LOW"] as const;

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="truncate max-w-[60%]">{label}</span>
        <span className="font-mono font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function QuestionBankAnalyticsClient() {
  const { toast } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [topQuestions, setTopQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/questionbank/admin/dashboard/stats").then(r => r.json()),
      fetch("/api/questionbank/companies").then(r => r.json()),
      fetch("/api/questionbank/tags").then(r => r.json()),
      fetch("/api/questionbank/categories").then(r => r.json()),
      // Fetch questions sorted by occurrence (high occurrenceCount = frequently asked)
      fetch("/api/questionbank/questions?page=0&size=10&importance=CRITICAL").then(r => r.json()),
    ]).then(([statsData, compData, tagData, catData, qData]) => {
      if (statsData.success) setStats(statsData.data);
      if (compData.success) setCompanies(compData.data);
      if (tagData.success) setTags(tagData.data);
      if (catData.success) setCategories(catData.data);
      if (qData.success) setTopQuestions(qData.data.content ?? []);
    }).catch(() => toast("Failed to load analytics data", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Derived computations
  const topCompaniesByQuestions = [...companies]
    .sort((a, b) => b.questionCount - a.questionCount)
    .slice(0, 10);

  const topCompaniesBySessions = [...companies]
    .sort((a, b) => (b.sessionCount ?? 0) - (a.sessionCount ?? 0))
    .slice(0, 10);

  const topTags = [...tags]
    .filter(t => (t.questionCount ?? 0) > 0)
    .sort((a, b) => (b.questionCount ?? 0) - (a.questionCount ?? 0))
    .slice(0, 15);

  const topCategories = [...categories]
    .sort((a, b) => b.questionCount - a.questionCount)
    .slice(0, 10);

  const maxCompanyQ = topCompaniesByQuestions[0]?.questionCount ?? 1;
  const maxCompanyS = topCompaniesBySessions[0]?.sessionCount ?? 1;
  const maxTag = topTags[0]?.questionCount ?? 1;
  const maxCat = topCategories[0]?.questionCount ?? 1;

  const importanceTotal = stats
    ? Object.values(stats.questionsByImportance).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-8">

      {/* Summary strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Questions", value: stats.totalQuestions, icon: FileText, color: "text-blue-500" },
            { label: "Companies", value: stats.totalCompanies, icon: Building2, color: "text-amber-500" },
            { label: "Sessions", value: stats.totalSessions, icon: BarChart2, color: "text-indigo-500" },
            { label: "Candidates", value: stats.totalCandidates, icon: TrendingUp, color: "text-teal-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${color} shrink-0`} />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Questions by importance */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                Questions by Importance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {IMPORTANCE_ORDER.map(key => {
                const count = stats.questionsByImportance[key];
                const pct = importanceTotal > 0 ? Math.round((count / importanceTotal) * 100) : 0;
                const barColors: Record<string, string> = {
                  CRITICAL: "bg-red-500",
                  HIGH: "bg-orange-500",
                  MODERATE: "bg-yellow-500",
                  LOW: "bg-green-500",
                };
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${IMPORTANCE_COLORS[key]}`}>{key}</span>
                      <span className="font-mono tabular-nums">{count} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${barColors[key]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-1">{importanceTotal} total classified</p>
            </CardContent>
          </Card>
        )}

        {/* Top categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              topCategories.map(cat => (
                <BarRow
                  key={cat.id}
                  label={cat.name}
                  value={cat.questionCount}
                  max={maxCat}
                  color="bg-blue-500"
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Top companies by questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Companies by Question Count
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCompaniesByQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              topCompaniesByQuestions.map(c => (
                <BarRow
                  key={c.id}
                  label={c.name}
                  value={c.questionCount}
                  max={maxCompanyQ}
                  color="bg-amber-500"
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Top companies by sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Companies by Session Count
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCompaniesBySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              topCompaniesBySessions.map(c => (
                <BarRow
                  key={c.id}
                  label={c.name}
                  value={c.sessionCount ?? 0}
                  max={maxCompanyS}
                  color="bg-indigo-500"
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Top tags */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Most Used Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tag usage data available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {topTags.map(tag => (
                  <BarRow
                    key={tag.id}
                    label={`#${tag.name}`}
                    value={tag.questionCount ?? 0}
                    max={maxTag}
                    color="bg-teal-500"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical questions spotlight */}
        {topQuestions.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Critical Questions Spotlight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topQuestions.map((q, idx) => (
                <div key={q.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <span className="text-xs font-mono text-muted-foreground mt-0.5 w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{q.text}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{q.category}</span>
                      {q.askedByCompanies.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          · {q.askedByCompanies.slice(0, 3).join(", ")}{q.askedByCompanies.length > 3 ? ` +${q.askedByCompanies.length - 3}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {q.occurrenceCount > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">×{q.occurrenceCount}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </div>

      {stats?.lastDigestDate && (
        <p className="text-xs text-muted-foreground">
          Last digest: {new Date(stats.lastDigestDate).toLocaleString()}
        </p>
      )}
    </div>
  );
}
