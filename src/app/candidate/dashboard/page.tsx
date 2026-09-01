import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { AppShell } from "@/app/components/AppShell";
import { ProfileCompletionCard } from "@/components/common/ProfileCompletionCard";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Calendar,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  Building2,
  Clock,
  ArrowRight,
  Briefcase,
  ExternalLink,
  Award,
} from "lucide-react";
import { InterviewTimelineCard } from "./InterviewTimelineCard";
import { CandidateDashboardStats } from "./CandidateDashboardStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Interview = {
  id: string;
  status: string;
  scheduledAt: string | null;
  expiresAt: string | null;
  endedAt: string | null;
  jdId: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
};

type ClientMatch = {
  clientId: string;
  clientName: string;
};

type CandidateProfile = {
  name?: string | null;
  contactNumber?: string | null;
  officialEmail?: string | null;
  personalEmail?: string | null;
  batch?: string | null;
  source?: string | null;
  skillSet?: string | null;
  yoePortrayed?: number | null;
  yop?: number | null;
};

function isPast(i: Interview): boolean {
  if (["COMPLETED", "REVIEW_PENDING", "SIGNED_OFF", "EXPIRED", "WITHDRAWN"].includes(i.status)) return true;
  if (i.status === "SCHEDULED" && i.scheduledAt) {
    return (Date.now() - new Date(i.scheduledAt).getTime()) / 36e5 > 24;
  }
  return false;
}

function isUpcoming(i: Interview): boolean {
  return (
    i.status === "DRAFT" ||
    i.status === "IN_PROGRESS" ||
    (i.status === "SCHEDULED" && !isPast(i))
  );
}

function getScheduleStatus(i: Interview): 'not_yet' | 'expired' | 'available' {
  const now = Date.now();
  if (i.scheduledAt && now < new Date(i.scheduledAt).getTime()) return 'not_yet';
  if (i.expiresAt && now > new Date(i.expiresAt).getTime()) return 'expired';
  return 'available';
}

async function parseJsonSafe<T>(res: Response | null | undefined, fallback: T): Promise<T> {
  if (!res?.ok) return fallback;
  try {
    const text = await res.text();
    if (!text.trim()) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function getJdTitle(jdId: string, token: string | undefined): Promise<string> {
  const res = await apiServer(`/interviews/jd/${jdId}`, token).catch(() => null);
  const jd = await parseJsonSafe(res, { title: undefined } as { title?: string });
  return jd.title ?? "Unknown role";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const VERDICT_LABEL: Record<string, string> = {
  READY: "Ready",
  NOT_READY: "Not Ready",
  NEEDS_COACHING: "Needs Coaching",
  NEEDS_1_WEEK_PREP: "Needs 1-week prep",
  NEEDS_RESKILLING: "Needs Reskilling",
  MISMATCH_WITH_JD: "Mismatch with JD",
  WITHDRAWN: "Ended early",
};

const VERDICT_COLOR: Record<string, string> = {
  READY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  NOT_READY: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  NEEDS_COACHING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  NEEDS_1_WEEK_PREP: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  NEEDS_RESKILLING: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  MISMATCH_WITH_JD: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  WITHDRAWN: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default async function CandidateDashboard() {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/login");

  const [interviewsRes, profileRes, matchesRes] = await Promise.all([
    apiServer("/interviews/mine", session.token).catch(() => null),
    apiServer("/auth/me", session.token).catch(() => null),
    apiServer("/candidate/matches", session.token).catch(() => null),
  ]);

  const [interviews, profile, matchesData] = await Promise.all([
    parseJsonSafe<Interview[]>(interviewsRes, []),
    parseJsonSafe<CandidateProfile | null>(profileRes, null),
    parseJsonSafe<{ matches?: ClientMatch[] }>(matchesRes, { matches: [] }),
  ]);
  const clientMatches = matchesData.matches ?? [];

  const upcoming = interviews.filter(isUpcoming);
  const past = interviews.filter(isPast);

  const allIds = [...new Set(interviews.map((i) => i.jdId))];
  const jdMap: Record<string, string> = {};
  await Promise.all(allIds.map(async (jdId) => {
    jdMap[jdId] = await getJdTitle(jdId, session.token);
  }));

  // Pick the most recent interview for timeline
  const latestInterview = interviews.length > 0
    ? interviews.sort((a, b) => new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime())[0]
    : null;

  return (
    <AppShell title="My Interviews" subtitle={`Welcome back, ${session.username}`}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Glassmorphic Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-slate-900/90 p-6 text-white shadow-lg backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-inner">
                <Award className="h-6 w-6 text-purple-200 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    Welcome back, {session.username}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">
                    <Sparkles className="h-3 w-3 text-purple-300" />
                    Candidate Portal
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-purple-100/90 font-medium">
                  Track your scheduled AI technical interviews, review detailed evaluation feedback, and discover prospective client matches.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top metrics & profile cards row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile && <ProfileCompletionCard profile={profile} />}
          <CandidateDashboardStats upcoming={upcoming.length} completed={past.length} />
        </div>

        {/* Latest interview timeline */}
        {latestInterview && (
          <div className="grid gap-4 sm:grid-cols-1">
            <InterviewTimelineCard interview={latestInterview} />
          </div>
        )}

        {/* Client Matches Card */}
        {clientMatches.length > 0 && (
          <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
            <div className="panel-header panel-header-accent-purple flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Matched Client Directory
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
                {clientMatches.length} client {clientMatches.length === 1 ? "match" : "matches"}
              </span>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    You have active matches with <span className="font-extrabold text-[var(--text-primary)]">{clientMatches.length} client organization(s)</span>:
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Building2 className="h-3.5 w-3.5" />
                      {clientMatches[0].clientName}
                    </span>
                    {clientMatches.length > 1 && (
                      <span className="text-xs font-bold text-[var(--text-secondary)]">
                        +{clientMatches.length - 1} more organization(s)
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href="/candidate/matches"
                  className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs shadow-2xs transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-1.5"
                >
                  View All Matches
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Interviews Card */}
        <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-blue-300/30">
          <div className="panel-header panel-header-accent-blue flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Upcoming Interviews
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-300 border border-blue-500/20">
              {upcoming.length} scheduled
            </span>
          </div>

          <div className="p-5">
            {upcoming.length ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">
                      <th className="px-4 py-3.5">Target Role</th>
                      <th className="px-4 py-3.5">Scheduled Date</th>
                      <th className="px-4 py-3.5">Session Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {upcoming.map((i) => (
                      <tr key={i.id} className="hover:bg-[var(--surface-subtle)]/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-sm text-[var(--text-primary)]">
                          {jdMap[i.jdId]}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text-secondary)]">
                          {formatDate(i.scheduledAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border ${
                            i.status === "IN_PROGRESS"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : i.status === "DRAFT"
                              ? "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                              : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          }`}>
                            {i.status === "IN_PROGRESS" ? "In Progress" : i.status === "DRAFT" ? "Draft" : "Scheduled"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {(() => {
                            const schedSt = getScheduleStatus(i);
                            if (schedSt === 'not_yet') {
                              return (
                                <span className="inline-flex items-center rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                                  Not yet available
                                </span>
                              );
                            }
                            if (schedSt === 'expired' || i.status === 'EXPIRED') {
                              return (
                                <span className="inline-flex items-center rounded-md bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                                  Expired
                                </span>
                              );
                            }
                            return (
                              <Link
                                href={`/interview/${i.id}`}
                                className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 text-xs shadow-2xs transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-1.5"
                              >
                                Attend Session
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No upcoming interviews"
                description="No upcoming interview sessions scheduled at this time."
                icon={<Calendar className="h-10 w-10 stroke-[1.5] text-blue-500" />}
              />
            )}
          </div>
        </div>

        {/* Past Interviews Card */}
        <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Past & Completed Interviews
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
              {past.length} completed
            </span>
          </div>

          <div className="p-5">
            {past.length ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">
                      <th className="px-4 py-3.5">Target Role</th>
                      <th className="px-4 py-3.5">Completed Date</th>
                      <th className="px-4 py-3.5">Evaluation Verdict</th>
                      <th className="px-4 py-3.5 text-right">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {past.map((i) => (
                      <tr key={i.id} className="hover:bg-[var(--surface-subtle)]/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-sm text-[var(--text-primary)]">
                          {jdMap[i.jdId]}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-[var(--text-secondary)]">
                          {formatDate(i.endedAt ?? i.scheduledAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          {i.status === "EXPIRED" ? (
                            <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                              Expired
                            </span>
                          ) : i.finalVerdict === "WITHDRAWN" || (!i.finalVerdict && i.proposedVerdict === "WITHDRAWN") ? (
                            <span className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                              Ended Early
                            </span>
                          ) : i.status === "REVIEW_PENDING" ? (
                            <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                              Under Review
                            </span>
                          ) : i.status === "SIGNED_OFF" && i.finalVerdict ? (
                            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border ${VERDICT_COLOR[i.finalVerdict] ?? "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"}`}>
                              {VERDICT_LABEL[i.finalVerdict] ?? i.finalVerdict}
                            </span>
                          ) : i.proposedVerdict ? (
                            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border ${VERDICT_COLOR[i.proposedVerdict] ?? "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"}`}>
                              {VERDICT_LABEL[i.proposedVerdict] ?? i.proposedVerdict}
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)] text-xs font-semibold">Pending Review</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/candidate/feedback/${i.id}`}
                            className="rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-3.5 py-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            View Feedback
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No completed interviews"
                description="No past or completed interviews recorded."
                icon={<CheckCircle className="h-10 w-10 stroke-[1.5] text-purple-500" />}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
