import { NextResponse } from "next/server";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

/** Public candidate self-registration — proxied server-side for the same reason as the master-data lookup above. */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const response = await fetch(`${GATEWAY}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[public register] proxy error:", error);
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }
}
