import { NextResponse } from "next/server";
import { clearAuthCookiesOnResponse } from "@/lib/authCookies";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAuthCookiesOnResponse(res);
  return res;
}
