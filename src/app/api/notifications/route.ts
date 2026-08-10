import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionOrRefresh } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { isStaffReadRole } from "@/lib/staffRoles";

export const READ_BEFORE_COOKIE = "br_notif_read_before";
export const READ_IDS_COOKIE = "br_notif_read_ids";
const MAX_TRACKED_IDS = 200;
const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h — how far back "new" events surface

type NotificationItem = {
  id: string;
  icon: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let notifications: NotificationItem[];

    if (session.role === "CANDIDATE") {
      const res = await apiServer("/interviews/mine", session.token);
      const interviews = res.ok ? await res.json().catch(() => []) : [];
      notifications = buildCandidateNotifications(interviews);
    } else if (isStaffReadRole(session.role)) {
      const [summaryRes, tokenRes, clientsRes] = await Promise.allSettled([
        apiServer("/interviews/summary", session.token),
        apiServer("/tokens/check-limit", session.token),
        apiServer("/recruiter/clients", session.token),
      ]);

      const interviews: any[] =
        summaryRes.status === "fulfilled" && summaryRes.value.ok
          ? await summaryRes.value.json().catch(() => [])
          : [];

      const tokenData: any =
        tokenRes.status === "fulfilled" && tokenRes.value.ok
          ? await tokenRes.value.json().catch(() => null)
          : null;

      const clients: any[] =
        clientsRes.status === "fulfilled" && clientsRes.value.ok
          ? await clientsRes.value.json().catch(() => [])
          : [];

      notifications = buildAdminNotifications(interviews, tokenData, clients);
    } else {
      notifications = [];
    }

    notifications = await applyReadState(notifications);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

/**
 * Notifications are synthesized fresh on every request (no backing table), so "read"
 * state can't live on the item itself — it's tracked via cookies instead:
 *  - READ_BEFORE_COOKIE: bulk "mark all read" cutoff timestamp.
 *  - READ_IDS_COOKIE: individually dismissed notification ids (for items newer than the cutoff).
 */
async function applyReadState(notifications: NotificationItem[]): Promise<NotificationItem[]> {
  const jar = await cookies();
  const readBeforeMs = Date.parse(jar.get(READ_BEFORE_COOKIE)?.value ?? "");
  const readIds = new Set((jar.get(READ_IDS_COOKIE)?.value ?? "").split(",").filter(Boolean));

  return notifications.map((n) => {
    const timeMs = Date.parse(n.time);
    const readByBulk = !Number.isNaN(readBeforeMs) && !Number.isNaN(timeMs) && timeMs <= readBeforeMs;
    return readByBulk || readIds.has(n.id) ? { ...n, read: true } : n;
  });
}

export function pruneReadIds(ids: string[]): string[] {
  return ids.slice(-MAX_TRACKED_IDS);
}

function buildCandidateNotifications(interviews: any[]) {
  const notifications: any[] = [];

  for (const iv of interviews) {
    if (iv.status === "SCHEDULED") {
      notifications.push({
        id: `interview-${iv.id}-scheduled`,
        icon: "Clock",
        title: "Interview Scheduled",
        message: "You have an upcoming interview. Check your dashboard to attend.",
        time: iv.scheduledAt ?? iv.createdAt,
        read: false,
        type: "info",
      });
    }
    if (iv.status === "IN_PROGRESS") {
      notifications.push({
        id: `interview-${iv.id}-inprogress`,
        icon: "Clock",
        title: "Interview In Progress",
        message: "Your interview session is currently active. Join now to continue.",
        time: iv.updatedAt ?? iv.createdAt,
        read: false,
        type: "warning",
      });
    }
    if (iv.status === "COMPLETED") {
      notifications.push({
        id: `interview-${iv.id}-completed`,
        icon: "CheckCircle",
        title: "Interview Completed",
        message: "Your interview is done. AI assessment is being generated.",
        time: iv.endedAt ?? iv.createdAt,
        read: true,
        type: "success",
      });
    }
    if (iv.status === "REVIEW_PENDING") {
      notifications.push({
        id: `interview-${iv.id}-feedback`,
        icon: "FileText",
        title: "Feedback Available",
        message: "Your AI assessment is ready. Manager review is pending.",
        time: iv.endedAt ?? iv.createdAt,
        read: true,
        type: "info",
      });
    }
    if (iv.status === "SIGNED_OFF" && iv.finalVerdict) {
      const verdict = iv.finalVerdict.replace(/_/g, " ");
      notifications.push({
        id: `interview-${iv.id}-reviewed`,
        icon: "CheckCircle",
        title: "Interview Reviewed",
        message: `Your interview has been reviewed. Verdict: ${verdict}`,
        time: iv.endedAt ?? iv.createdAt,
        read: false,
        type: "success",
      });
    }
    if (iv.proposedVerdict === "WITHDRAWN") {
      notifications.push({
        id: `interview-${iv.id}-withdrawn`,
        icon: "AlertTriangle",
        title: "Interview Ended Early",
        message: "Your interview was marked as withdrawn.",
        time: iv.endedAt ?? iv.createdAt,
        read: true,
        type: "warning",
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function isRecent(iso: string | undefined | null): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && Date.now() - t <= RECENT_WINDOW_MS;
}

function buildAdminNotifications(interviews: any[], tokenData: any, clients: any[]) {
  const notifications: any[] = [];
  const now = new Date().toISOString();

  // New clients added
  for (const c of clients) {
    if (!isRecent(c.createdAt)) continue;
    notifications.push({
      id: `client-${c.id}-added`,
      icon: "FileText",
      title: "New Client Added",
      message: `${c.clientName ?? "A new client"} was added${c.jdRole ? ` — ${c.jdRole}` : ""}.`,
      time: c.createdAt,
      read: false,
      type: "info",
    });
  }

  // New interviews created
  for (const iv of interviews) {
    if (!isRecent(iv.createdAt)) continue;
    notifications.push({
      id: `interview-${iv.id}-created`,
      icon: "Clock",
      title: "Interview Created",
      message: `An interview was created for ${iv.candidateName ?? "a candidate"}${iv.jdTitle ? ` (${iv.jdTitle})` : ""}.`,
      time: iv.createdAt,
      read: false,
      type: "info",
    });
  }

  // Interviews completed
  for (const iv of interviews) {
    if (iv.status !== "COMPLETED" && iv.status !== "REVIEW_PENDING") continue;
    const endedAt = iv.endedAt ?? iv.createdAt;
    if (!isRecent(endedAt)) continue;
    notifications.push({
      id: `interview-${iv.id}-completed`,
      icon: "CheckCircle",
      title: "Interview Completed",
      message: `${iv.candidateName ?? "A candidate"}'s interview has finished and is ready for review.`,
      time: endedAt,
      read: false,
      type: "success",
    });
  }

  const reviewPending = interviews.filter((iv: any) => iv.status === "REVIEW_PENDING");
  if (reviewPending.length > 0) {
    notifications.push({
      id: "admin-review-pending",
      icon: "FileText",
      title: "Interviews Awaiting Review",
      message: `${reviewPending.length} interview${reviewPending.length === 1 ? "" : "s"} need${reviewPending.length === 1 ? "s" : ""} your sign-off.`,
      time: reviewPending[0].endedAt ?? reviewPending[0].createdAt ?? now,
      read: false,
      type: "warning",
    });
  }

  const inProgress = interviews.filter((iv: any) => iv.status === "IN_PROGRESS");
  if (inProgress.length > 0) {
    notifications.push({
      id: "admin-in-progress",
      icon: "Clock",
      title: "Live Interviews",
      message: `${inProgress.length} interview${inProgress.length === 1 ? " is" : "s are"} currently in progress.`,
      time: now,
      read: true,
      type: "info",
    });
  }

  const scheduledToday = interviews.filter((iv: any) => {
    if (iv.status !== "SCHEDULED" || !iv.scheduledAt) return false;
    const d = new Date(iv.scheduledAt);
    const today = new Date();
    return d.getFullYear() === today.getFullYear()
      && d.getMonth() === today.getMonth()
      && d.getDate() === today.getDate();
  });
  if (scheduledToday.length > 0) {
    notifications.push({
      id: "admin-scheduled-today",
      icon: "Clock",
      title: "Interviews Scheduled Today",
      message: `${scheduledToday.length} interview${scheduledToday.length === 1 ? "" : "s"} scheduled for today.`,
      time: now,
      read: true,
      type: "info",
    });
  }

  if (tokenData?.overLimit) {
    notifications.push({
      id: "admin-token-overlimit",
      icon: "AlertTriangle",
      title: "Token Limit Exceeded",
      message: `Daily token usage (${tokenData.usage?.toLocaleString()}) has exceeded the limit of ${tokenData.limit?.toLocaleString()}.`,
      time: now,
      read: false,
      type: "error",
    });
  } else if (tokenData?.nearLimit) {
    notifications.push({
      id: "admin-token-warning",
      icon: "AlertTriangle",
      title: "Approaching Token Limit",
      message: `${tokenData.remainingTokens?.toLocaleString()} tokens remaining today (limit: ${tokenData.limit?.toLocaleString()}).`,
      time: now,
      read: false,
      type: "warning",
    });
  }

  return notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
