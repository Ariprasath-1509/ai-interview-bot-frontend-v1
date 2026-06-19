import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

export async function POST() {
  const session = await getSessionOrRefresh();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${GATEWAY}/clients/matching/cache/clear`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
