import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionOrRefresh();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const response = await fetch(`${GATEWAY}/analytics/interviewers`, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Interviewers analytics error:", error);
    return NextResponse.json([]);
  }
}
