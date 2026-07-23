import { NextResponse } from "next/server";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

/**
 * Public, unauthenticated lookup for pre-login pages (e.g. candidate registration).
 * Runs server-side so the browser only ever talks to its own origin — a direct client
 * fetch to the gateway's IP:port fails in prod when the site is served over HTTPS
 * (mixed-content) or the gateway isn't reachable from outside the internal network.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  try {
    const response = await fetch(`${GATEWAY}/auth/master-data/${encodeURIComponent(category)}`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[public master-data] proxy error:", error);
    return NextResponse.json([], { status: 503 });
  }
}
