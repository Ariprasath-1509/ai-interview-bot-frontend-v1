import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { CheckCircle, Clock, AlertTriangle, FileText } from "lucide-react";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For candidates, get notifications from their interviews
    if (session.role === "CANDIDATE") {
      const res = await apiServer("/interviews/mine", session.token);
      if (!res.ok) {
        return NextResponse.json([]);
      }

      const interviews = await res.json();
      const notifications = buildCandidateNotifications(interviews);
      return NextResponse.json(notifications);
    }

    // For admin roles, get system notifications
    const notifications = buildAdminNotifications();
    return NextResponse.json(notifications);

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
        message: `You have an upcoming interview. Check your dashboard to attend.`,
        time: iv.scheduledAt ?? iv.createdAt,
        read: false,
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

function buildAdminNotifications() {
  // For now, return empty array - in real implementation, this would fetch from database
  return [];
}