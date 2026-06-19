import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/authCookies";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const upstream = await fetch(`${GATEWAY}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!upstream || !upstream.ok) {
    const err = await upstream?.json().catch(() => null);
    return NextResponse.json(
      { ok: false, error: err?.error ?? "Login failed" },
      { status: upstream?.status ?? 502 }
    );
  }

  const data = (await upstream.json()) as {
    ok: boolean;
    token: string;
    refreshToken: string;
    role: string;
    name?: string;
    branch?: string;
    expiresIn?: number;
  };

  if (!data.token || !data.refreshToken) {
    return NextResponse.json({ ok: false, error: "Login response missing tokens" }, { status: 502 });
  }

  const username = data.name ?? (body as { username?: string }).username ?? "User";
  const res = NextResponse.json({ ok: true, role: data.role });
  setAuthCookies(res.cookies, {
    token: data.token,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    role: data.role,
    name: username,
    branch: data.branch,
  });
  return res;
}
