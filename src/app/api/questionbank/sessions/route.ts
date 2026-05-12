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
    const response = await fetch(`${GATEWAY}/api/questionbank/sessions`, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}