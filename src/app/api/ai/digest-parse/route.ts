import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

export const dynamic = "force-dynamic";
const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const response = await fetch(`${GATEWAY}/ai/digest-parse`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("AI digest-parse error:", error);
    return NextResponse.json({ success: false, message: "AI service unavailable" }, { status: 503 });
  }
}
