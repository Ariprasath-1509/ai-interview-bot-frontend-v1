import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function GET() {
  const session = await getSessionOrRefresh();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const res = await fetch(`${GATEWAY}/auth/organizations`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "X-User-Role": session.role,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? [], { status: res.status });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.text();
    const res = await fetch(`${GATEWAY}/auth/organizations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        "X-User-Role": session.role,
      },
      body,
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
