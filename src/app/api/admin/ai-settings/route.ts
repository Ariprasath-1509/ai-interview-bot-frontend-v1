import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";
import { isStaffAdminRole } from "@/lib/staffRoles";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

async function proxyAiSettings(init?: RequestInit) {
  const session = await getSessionOrRefresh();
  // ai-service itself has no per-endpoint auth on /ai/admin/** (relies on callers being gated) —
  // enforce admin-only access here so a non-admin session can't view or change LLM routing/keys.
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const response = await fetch(`${GATEWAY}/ai/admin/llm-settings`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        ...(session.userId ? { "X-User-Id": session.userId } : {}),
        "X-User-Role": session.role,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[ai-settings] proxy error:", error);
    return NextResponse.json({ success: false, message: "AI service unavailable" }, { status: 503 });
  }
}

export async function GET() {
  return proxyAiSettings();
}

export async function PUT(req: Request) {
  const body = await req.text();
  return proxyAiSettings({ method: "PUT", body });
}
