import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const res = await fetch(`${GATEWAY}/ai/assess-status/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    });

    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    console.error("assess-status proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
