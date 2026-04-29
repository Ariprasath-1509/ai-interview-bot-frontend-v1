import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const response = await fetch("http://localhost:6002/analytics/interviewers", {
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
