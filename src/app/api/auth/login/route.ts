import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { error: data.error ?? "Login failed" },
        { status: res.status }
      );
    }

    const jar = await cookies();
    const opts = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 86400 };
    jar.set("br_jwt", data.token, opts);
    jar.set("br_role", data.role, { ...opts, httpOnly: false });
    jar.set("br_username", data.name ?? "", { ...opts, httpOnly: false });
    if (data.adminSource) {
      jar.set("br_admin_source", data.adminSource, { ...opts, httpOnly: false });
    }

    return NextResponse.json({ ok: true, role: data.role, name: data.name, adminSource: data.adminSource });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
