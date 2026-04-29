import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json([], { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  try {
    const response = await fetch(`http://localhost:6002/auth/candidates?search=${encodeURIComponent(search)}`, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Candidate search error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
