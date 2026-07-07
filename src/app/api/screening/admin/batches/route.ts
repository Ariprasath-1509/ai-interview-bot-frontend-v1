import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";
import { isStaffReadRole } from "@/lib/staffRoles";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

async function proxy(path: string, init?: RequestInit) {
  const session = await getSessionOrRefresh();
  if (!session || !isStaffReadRole(session.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const response = await fetch(`${GATEWAY}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        "X-User-Role": session.role,
        ...(session.userId ? { "X-User-Id": session.userId } : {}),
        ...(session.username ? { "X-User-Name": session.username } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[screening/admin/batches] proxy error:", error);
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }
}

export async function GET() {
  return proxy("/screening/admin/batches");
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxy("/screening/admin/batches", { method: "POST", body });
}
