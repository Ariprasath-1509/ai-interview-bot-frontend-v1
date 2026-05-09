import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const QUESTIONBANK = process.env.QUESTIONBANK_URL ?? 'http://localhost:6010';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sentBy = searchParams.get("sentBy") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "20";

  const params = new URLSearchParams();
  if (sentBy) params.set("sentBy", sentBy);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", page);
  params.set("size", size);

  try {
    const response = await fetch(`${QUESTIONBANK}/api/admin/email/logs?${params}`, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Email logs fetch error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}