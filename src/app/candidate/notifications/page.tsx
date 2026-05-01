import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { AppShell } from "@/app/components/AppShell";
import { Bell, CheckCircle, Clock, AlertTriangle, FileText } from "lucide-react";

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

function buildNotifications(interviews: Interview[]) {
  const notifications: { icon: React.ReactNode; title: string; message: string; time: string; read: boolean }[] = [];

  for (const iv of interviews) {
    if (iv.status === "SCHEDULED") {
      notifications.push({
        icon: <Clock size={16} className="text-blue-500" />,
        title: "Interview Scheduled",
        message: `You have an upcoming interview. Check your dashboard to attend.`,
        time: iv.scheduledAt ?? "",
        read: false,
      });
    }
    if (iv.status === "SIGNED_OFF" && iv.finalVerdict) {
      const verdict = iv.finalVerdict.replace(/_/g, " ");
      notifications.push({
        icon: <CheckCircle size={16} className="text-emerald-500" />,
        title: "Interview Reviewed",
        message: `Your interview has been reviewed. Verdict: ${verdict}`,
        time: iv.endedAt ?? "",
        read: false,
      });
    }
    if (iv.status === "REVIEW_PENDING") {
      notifications.push({
        icon: <FileText size={16} className="text-amber-500" />,
        title: "Feedback Available",
        message: "Your AI assessment is ready. Manager review is pending.",
        time: iv.endedAt ?? "",
        read: true,
      });
    }
    if (iv.proposedVerdict === "WITHDRAWN") {
      notifications.push({
        icon: <AlertTriangle size={16} className="text-red-500" />,
        title: "Interview Ended Early",
        message: "Your interview was marked as withdrawn.",
        time: iv.endedAt ?? "",
        read: true,
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/login");

  const res = await apiServer("/interviews/mine", session.token).catch(() => null);
  const interviews: Interview[] = res?.ok ? await res.json() : [];
  const notifications = buildNotifications(interviews);

  return (
    <AppShell title="Notifications" subtitle="Stay updated on your interview progress.">
      <div className="max-w-2xl space-y-2">
        {notifications.length > 0 ? (
          notifications.map((n, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                n.read
                  ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  : "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20"
              }`}
            >
              <div className="mt-0.5 shrink-0">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{n.title}</p>
                  <span className="shrink-0 text-[11px] text-zinc-400">{formatTime(n.time)}</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{n.message}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <Bell size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm text-zinc-500">No notifications yet.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
