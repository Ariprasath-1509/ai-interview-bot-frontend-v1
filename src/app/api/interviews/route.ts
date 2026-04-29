import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    
    const response = await fetch("http://localhost:6002/interviews", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return new NextResponse("Backend error", { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Interview creation error:", error);
    return new NextResponse("Service unavailable", { status: 503 });
  }
}