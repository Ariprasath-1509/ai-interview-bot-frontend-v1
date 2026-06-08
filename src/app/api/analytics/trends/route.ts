import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export const dynamic = "force-dynamic";

const EMPTY_TRENDS = {
  dailyTrends: [],
  weeklyTrends: [],
  marketTrends: {
    period: "Current open demand from active clients",
    activeClients: 0,
    benchDemand: 0,
    marketDemand: 0,
    topSkills: [],
    topRoles: [],
    hasData: false,
  },
  hasData: false,
};

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const response = await fetch(`${GATEWAY}/analytics/trends`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Trends API error:", response.status, await response.text().catch(() => ""));
      return NextResponse.json(EMPTY_TRENDS);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Trends analytics error:", error);
    return NextResponse.json(EMPTY_TRENDS);
  }
}
