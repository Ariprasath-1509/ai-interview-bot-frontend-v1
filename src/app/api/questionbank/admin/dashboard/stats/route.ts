import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${GATEWAY}/api/questionbank/admin/dashboard/stats`, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`Gateway returned ${response.status}: ${response.statusText}`);
      return NextResponse.json({ success: false, message: "Service unavailable" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin stats fetch error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}