import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const interviewType = searchParams.get("interviewType") ?? "";
  const category = searchParams.get("category") ?? "";
  const company = searchParams.get("company") ?? "";
  const round = searchParams.get("round") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const importance = searchParams.get("importance") ?? "";
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "20";

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (interviewType) params.set("interviewType", interviewType);
  if (category) params.set("category", category);
  if (company) params.set("company", company);
  if (round) params.set("round", round);
  if (tag) params.set("tag", tag);
  if (importance) params.set("importance", importance);
  params.set("page", page);
  params.set("size", size);

  try {
    const response = await fetch(`${GATEWAY}/api/questionbank/questions?${params}`, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Question search error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const response = await fetch(`${GATEWAY}/api/questionbank/questions`, {
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
    console.error("Question create error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}