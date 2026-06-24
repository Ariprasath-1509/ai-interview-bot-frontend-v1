import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";
import { proxyError, safeJson } from "@/lib/apiClient";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Remove undefined fields to avoid backend issues
    const cleanBody = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined)
    );

    const response = await fetch(`${GATEWAY}/interviews`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(cleanBody)
    });

    if (!response.ok) {
      return proxyError(response);
    }

    const data = await safeJson(response);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Interview creation error:", error);
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}