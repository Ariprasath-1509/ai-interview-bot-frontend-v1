import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { AppShell } from "@/app/components/AppShell";
import { ProfileCompletionCard } from "@/components/common/ProfileCompletionCard";
import { InterviewTimelineCard } from "./InterviewTimelineCard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Interview = {
  id: string;
  status: string;
  scheduledAt: string | null;
  endedAt: string | null;
  jdId: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
};

function isPast(i: Interview): boolean {
  if (["COMPLETED", "REVIEW_PENDING", "SIGNED_OFF"].includes(i.status)) return true;
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

async function getJdTitle(jdId: string, token: string | undefined): Promise<string> {
  const res = await apiServer(`/interviews/jd/${jdId}`, token).catch(() => null);
  if (!res?.ok) return "Unknown role";
  const jd = (await res.json()) as { title?: string };
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
  WITHDRAWN: "⚠ Ended early",
};

const VERDICT_COLOR: Record<string, string> = {
  READY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  NOT_READY: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  NEEDS_COACHING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  NEEDS_1_WEEK_PREP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  NEEDS_RESKILLING: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  MISMATCH_WITH_JD: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  WITHDRAWN: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default async function CandidateDashboard() {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/login");

  const [interviewsRes, profileRes, matchesRes] = await Promise.all([
    apiServer("/interviews/mine", session.token).catch(() => null),
    apiServer("/auth/me", session.token).catch(() => null),
    apiServer("/candidate/matches", session.token).catch(() => null),
  ]);

  const interviews: Interview[] = interviewsRes?.ok ? await interviewsRes.json() : [];
  const profile = profileRes?.ok ? await profileRes.json() : null;
  const matchesData = matchesRes?.ok ? await matchesRes.json() : { matches: [] };
  const clientMatches = matchesData.matches || [];

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
      <div className="max-w-4xl space-y-6">
        {/* Top cards row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Profile completion */}
          {profile && <ProfileCompletionCard profile={profile} />}

          {/* Quick stats */}
          <div className="card p-5">
            <h3 className="section-label mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{upcoming.length}</p>
                <p className="text-xs text-zinc-500">Upcoming</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{past.length}</p>
                <p className="text-xs text-zinc-500">Completed</p>
              </div>
            </div>
          </div>

          {/* Latest interview timeline */}
          {latestInterview && (
            <InterviewTimelineCard interview={latestInterview} />
          )}
        </div>

        {/* Client Matches */}
        {clientMatches.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Client Matches</h2>
            <div className="rounded-2xl border border-white/20 bg-white/70 p-5 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">You match with {clientMatches.length} client{clientMatches.length > 1 ? 's' : ''}:</p>
                  <Link
                    href={`/candidate/matches`}
                    className="text-base font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {clientMatches[0].clientName}
                    {clientMatches.length > 1 && (
                      <span className="text-zinc-500 dark:text-zinc-400">, +{clientMatches.length - 1} more</span>
                    )}
                  </Link>
                </div>
                <Link
                  href={`/candidate/matches`}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors duration-200 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  View All Matches
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Upcoming</h2>
          {upcoming.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 text-left">
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Role</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Scheduled</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((i) => (
                    <tr key={i.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                      <td className="px-4 py-3 font-medium">{jdMap[i.jdId]}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDate(i.scheduledAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          i.status === "IN_PROGRESS"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : i.status === "DRAFT"
                            ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                        }`}>
                          {i.status === "IN_PROGRESS" ? "In Progress" : i.status === "DRAFT" ? "Draft" : "Scheduled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/interview/${i.id}`}
                          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Attend
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              No upcoming interviews.
            </div>
          )}
        </section>

        {/* Past */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Past Interviews</h2>
          {past.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 text-left">
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Role</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Completed</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Verdict</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((i) => (
                    <tr key={i.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                      <td className="px-4 py-3 font-medium">{jdMap[i.jdId]}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDate(i.endedAt ?? i.scheduledAt)}</td>
                      <td className="px-4 py-3">
                        {i.finalVerdict === "WITHDRAWN" || (!i.finalVerdict && i.proposedVerdict === "WITHDRAWN") ? (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">Not Prepared</span>
                        ) : i.status === "REVIEW_PENDING" ? (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Under Review</span>
                        ) : i.status === "SIGNED_OFF" && i.finalVerdict ? (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT_COLOR[i.finalVerdict] ?? "bg-zinc-100 text-zinc-700"}`}>
                            {VERDICT_LABEL[i.finalVerdict] ?? i.finalVerdict}
                          </span>
                        ) : i.proposedVerdict ? (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT_COLOR[i.proposedVerdict] ?? "bg-zinc-100 text-zinc-700"}`}>
                            {VERDICT_LABEL[i.proposedVerdict] ?? i.proposedVerdict}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">Pending Review</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/candidate/feedback/${i.id}`}
                          className="rounded-lg border border-zinc-200 px-4 py-1.5 text-xs font-medium transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                        >
                          View Feedback
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              No completed interviews yet.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
