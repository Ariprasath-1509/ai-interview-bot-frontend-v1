import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies } from "@/lib/authCookies";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const accessToken = jar.get("br_jwt")?.value;
  const refreshToken = jar.get("br_refresh")?.value;

  try {
    await fetch(`${GATEWAY}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Best-effort server-side revoke; still clear local cookies.
  }

  clearAuthCookies(jar);
  return NextResponse.json({ ok: true });
}
