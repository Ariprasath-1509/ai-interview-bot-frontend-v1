import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const session = await getSessionOrRefresh();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidateId } = await params;

  const response = await fetch(
    `${GATEWAY}/interviews/candidates/${candidateId}/review-summary/download`,
    {
      headers: { Authorization: `Bearer ${session.token}` },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: response.status }
    );
  }

  const blob = await response.blob();
  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  const disposition = response.headers.get("Content-Disposition");
  if (disposition) headers.set("Content-Disposition", disposition);

  return new NextResponse(blob, { status: 200, headers });
}
