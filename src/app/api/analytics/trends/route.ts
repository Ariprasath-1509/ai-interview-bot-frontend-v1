import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const response = await fetch("http://localhost:8080/analytics/trends", {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return NextResponse.json({
        labels: [],
        datasets: [
          { label: 'Interviews Scheduled', data: [] },
          { label: 'Interviews Completed', data: [] }
        ]
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Trends analytics error:", error);
    return NextResponse.json({
      labels: [],
      datasets: [
        { label: 'Interviews Scheduled', data: [] },
        { label: 'Interviews Completed', data: [] }
      ]
    });
  }
}
