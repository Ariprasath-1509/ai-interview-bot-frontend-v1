import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const QUESTIONBANK = process.env.QUESTIONBANK_URL ?? 'http://localhost:6010';

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const response = await fetch(`${QUESTIONBANK}/api/admin/users/${id}/toggle-admin`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Toggle admin error:", error);
    return NextResponse.json({ success: false, message: "Service unavailable" }, { status: 503 });
  }
}