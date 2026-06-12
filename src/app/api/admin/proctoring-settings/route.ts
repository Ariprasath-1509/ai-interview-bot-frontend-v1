import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

async function proxyProctoringSettings(init?: RequestInit) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${GATEWAY}/auth/admin/proctoring-settings`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        ...(session.userId ? { "X-User-Id": session.userId } : {}),
        "X-User-Role": session.role,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proctoring settings proxy error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}

export async function GET() {
  return proxyProctoringSettings();
}

export async function PUT(req: Request) {
  const body = await req.text();
  return proxyProctoringSettings({ method: "PUT", body });
}
