import { NextResponse } from "next/server";

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

  const data = (await upstream.json()) as { ok: boolean; token: string; role: string; name?: string };
  const username = data.name ?? (body as { username?: string }).username ?? "User";
  const res = NextResponse.json({ ok: true, role: data.role });
  res.cookies.set("br_jwt", data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.cookies.set("br_role", data.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.cookies.set("br_username", username, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.cookies.set("br_issued", Date.now().toString(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res;
}
