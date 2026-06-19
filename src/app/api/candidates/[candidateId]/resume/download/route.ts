import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const session = await getSessionOrRefresh();
    if (!session?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateId } = await params;

    const response = await fetch(`${GATEWAY}/resumes/${candidateId}`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }
      const error = await response.text();
      return NextResponse.json({ error: error || "Download failed" }, { status: response.status });
    }

    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      response.headers.get("content-disposition") || 'attachment; filename="resume.pdf"';

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    console.error("Resume download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
