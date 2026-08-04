import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const res = await fetch(`${GATEWAY}/auth/me/password`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
