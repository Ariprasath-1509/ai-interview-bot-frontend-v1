import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { AppShell } from "@/app/components/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
  CheckCheck,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Interview = {
  id: string;
  status: string;
  scheduledAt: string | null;
  endedAt: string | null;
  jdId: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
};

interface NotificationItem {
  type: "SCHEDULED" | "SIGNED_OFF" | "REVIEW_PENDING" | "WITHDRAWN";
  icon: React.ReactNode;
  title: string;
  message: string;
  time: string;
  read: boolean;
  badge: { label: string; style: string };
}

function buildNotifications(interviews: Interview[]): NotificationItem[] {
  const notifications: NotificationItem[] = [];

  for (const iv of interviews) {
    if (iv.status === "SCHEDULED") {
      notifications.push({
        type: "SCHEDULED",
        icon: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
        title: "Interview Scheduled",
        message: "You have an upcoming AI technical evaluation. View your dashboard to attend session.",
        time: iv.scheduledAt ?? "",
        read: false,
        badge: { label: "Scheduled", style: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
      });
    }
    if (iv.status === "SIGNED_OFF" && iv.finalVerdict) {
      const verdict = iv.finalVerdict.replace(/_/g, " ");
      notifications.push({
        type: "SIGNED_OFF",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        title: "Interview Finalized & Reviewed",
        message: `Your technical evaluation score has been verified. Final Verdict: ${verdict}`,
        time: iv.endedAt ?? "",
        read: false,
        badge: { label: "Completed", style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
      });
    }
    if (iv.status === "REVIEW_PENDING") {
      notifications.push({
        type: "REVIEW_PENDING",
        icon: <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        title: "Evaluation Feedback Ready",
        message: "Your AI session response transcript is generated. Hiring manager sign-off is pending.",
        time: iv.endedAt ?? "",
        read: true,
        badge: { label: "Under Review", style: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
      });
    }
    if (iv.proposedVerdict === "WITHDRAWN") {
      notifications.push({
        type: "WITHDRAWN",
        icon: <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        title: "Session Ended Early",
        message: "Your interview session was recorded as withdrawn or ended early.",
        time: iv.endedAt ?? "",
        read: true,
        badge: { label: "Withdrawn", style: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function formatTime(iso: string) {
  if (!iso) return "Just now";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/login");

  const res = await apiServer("/interviews/mine", session.token).catch(() => null);
  const interviews: Interview[] = res?.ok ? await res.json() : [];
  const notifications = buildNotifications(interviews);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppShell title="Notifications" subtitle="Stay updated on your interview schedules and evaluation feedback.">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Glassmorphic Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-slate-900/90 p-6 text-white shadow-lg backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-inner">
                <Bell className="h-6 w-6 text-purple-200 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    Notifications & Activity Center
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">
                    <Sparkles className="h-3 w-3 text-purple-300" />
                    Live Activity Feed
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-purple-100/90 font-medium">
                  Real-time updates regarding scheduled technical interview rounds, evaluation sign-offs, and manager feedback status.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-extrabold text-white backdrop-blur-md">
                <CheckCheck className="h-4 w-4 text-purple-300" />
                {unreadCount > 0 ? `${unreadCount} New Unread Alert(s)` : "All Caught Up"}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications Panel Card Container */}
        <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Activity Feed & Alerts
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
              {notifications.length} total alert{notifications.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-5">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((n, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${
                      !n.read
                        ? "border-purple-500/40 bg-purple-500/5 dark:bg-purple-500/10"
                        : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] shadow-2xs">
                      {n.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-[var(--text-primary)]">
                            {n.title}
                          </p>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${n.badge.style}`}>
                            {n.badge.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--text-secondary)] font-semibold shrink-0">
                          {formatTime(n.time)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    {!n.read && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No notifications yet"
                description="Stay tuned! You will receive live updates when technical interviews are scheduled or reviewed."
                icon={<Bell className="h-10 w-10 stroke-[1.5] text-purple-500" />}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
