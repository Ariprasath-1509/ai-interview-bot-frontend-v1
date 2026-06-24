import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { isStaffReadRole } from "@/lib/staffRoles";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "CANDIDATE") {
      const res = await apiServer("/interviews/mine", session.token);
      if (!res.ok) return NextResponse.json([]);
      const interviews = await res.json();
      return NextResponse.json(buildCandidateNotifications(interviews));
    }

    if (isStaffReadRole(session.role)) {
      const [summaryRes, tokenRes] = await Promise.allSettled([
        apiServer("/interviews/summary", session.token),
        apiServer("/tokens/check-limit", session.token),
      ]);

      const interviews: any[] =
        summaryRes.status === "fulfilled" && summaryRes.value.ok
          ? await summaryRes.value.json().catch(() => [])
          : [];

      const tokenData: any =
        tokenRes.status === "fulfilled" && tokenRes.value.ok
          ? await tokenRes.value.json().catch(() => null)
          : null;

      return NextResponse.json(buildAdminNotifications(interviews, tokenData));
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
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

function buildAdminNotifications(interviews: any[], tokenData: any) {
  const notifications: any[] = [];
  const now = new Date().toISOString();

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

  return notifications;
}