import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const response = await fetch(`${GATEWAY}/api/questionbank/digest/commit`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Digest commit error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}