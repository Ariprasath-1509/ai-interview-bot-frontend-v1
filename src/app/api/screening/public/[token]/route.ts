import { NextResponse } from "next/server";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

// Public — no session. Possession of the token in the URL is the only credential.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const response = await fetch(`${GATEWAY}/screening/public/${token}`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[screening/public] proxy error:", error);
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }
}
