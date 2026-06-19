import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { applyRefreshToCookies } from "@/lib/tokenRefresh";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get("br_refresh")?.value;
  if (!refresh) {
    return NextResponse.json({ error: "No refresh token", code: "SESSION_EXPIRED" }, { status: 401 });
  }

  const refreshed = await applyRefreshToCookies(jar, refresh);
  if (!refreshed) {
    return NextResponse.json({ error: "Session expired", code: "SESSION_EXPIRED" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
