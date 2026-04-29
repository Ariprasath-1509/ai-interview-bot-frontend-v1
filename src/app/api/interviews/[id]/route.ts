import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "BENCH_MANAGER") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const response = await fetch(`http://localhost:6002/interviews/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return new NextResponse(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Interview deletion error:", error);
    return new NextResponse("Service unavailable", { status: 503 });
  }
}