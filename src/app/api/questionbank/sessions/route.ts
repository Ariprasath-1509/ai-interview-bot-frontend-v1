import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  ["page", "size", "company", "round", "candidate"].forEach((key) => {
    const v = searchParams.get(key);
    if (v) params.set(key, v);
  });

  try {
    const response = await fetch(`${GATEWAY}/questionbank/api/sessions?${params}`, {
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