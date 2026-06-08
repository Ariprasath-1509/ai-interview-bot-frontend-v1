import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function proxyAdminMasterData(path: string, init?: RequestInit) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${GATEWAY}/api/admin/master-data${path}`, {
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
    console.error("Master data proxy error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}
