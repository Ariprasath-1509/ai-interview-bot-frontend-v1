import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthCookies } from "@/lib/authCookies";

export const dynamic = "force-dynamic";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${GATEWAY}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let data: Record<string, unknown> = {};
    if (raw.trim()) {
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Invalid login response" }, { status: 502 });
      }
    }

    if (!res.ok || !data.ok) {
      const message = typeof data.error === "string" ? data.error : "Login failed";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const token = typeof data.token === "string" ? data.token : "";
    const refreshToken = typeof data.refreshToken === "string" ? data.refreshToken : "";
    if (!token || !refreshToken) {
      return NextResponse.json({ error: "Login response missing tokens" }, { status: 502 });
    }

    const jar = await cookies();
    setAuthCookies(jar, {
      token,
      refreshToken,
      expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : undefined,
      role: typeof data.role === "string" ? data.role : undefined,
      name: typeof data.name === "string" ? data.name : undefined,
      adminSource: typeof data.adminSource === "string" ? data.adminSource : undefined,
      branch: typeof data.branch === "string" ? data.branch : undefined,
    });

    return NextResponse.json({
      ok: true,
      role: data.role,
      name: data.name,
      adminSource: data.adminSource,
      branch: data.branch,
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
