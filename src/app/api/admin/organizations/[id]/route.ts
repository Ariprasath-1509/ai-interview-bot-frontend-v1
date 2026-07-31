import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrRefresh();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.text();
    const res = await fetch(`${GATEWAY}/auth/organizations/${id}`, {
      method: "PATCH",
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrRefresh();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const res = await fetch(`${GATEWAY}/auth/organizations/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "X-User-Role": session.role,
      },
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
