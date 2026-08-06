import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionOrRefresh();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const response = await fetch(`${GATEWAY}/tokens/analytics/per-interview`, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "X-User-Id": session.userId ?? "system",
      }
    });
    if (!response.ok) return new NextResponse("Backend error", { status: response.status });
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Per-interview token analytics error:", error);
    return new NextResponse("Service unavailable", { status: 503 });
  }
}
