import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const importance = searchParams.get("importance");
  const company = searchParams.get("company");
  const round = searchParams.get("round");
  const interviewType = searchParams.get("interviewType");
  const size = searchParams.get("size") ?? "100";
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (importance) params.set("importance", importance);
  if (company) params.set("company", company);
  if (round) params.set("round", round);
  if (interviewType) params.set("interviewType", interviewType);
  params.set("size", size);

  try {
    const response = await fetch(
      `${GATEWAY}/questionbank/api/questions/for-interview?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("for-interview question fetch error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}
