import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionOrRefresh();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return new NextResponse("Missing required query params: from, to", { status: 400 });
  }

  try {
    const backendUrl = `${GATEWAY}/analytics/report/download?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const response = await fetch(backendUrl, {
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "X-User-Id": session.userId ?? "system",
      },
    });

    if (response.status === 401 || response.status === 403) {
      return new NextResponse("Forbidden", { status: response.status });
    }

    if (!response.ok) {
      return new NextResponse(`Backend error: ${response.status}`, { status: response.status });
    }

    // Stream the PDF bytes back with the original Content-Disposition header
    const pdfBytes = await response.arrayBuffer();
    const contentDisposition = response.headers.get("Content-Disposition")
      ?? `attachment; filename="BenchReadiness_Report_${from}_to_${to}.pdf"`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Report download error:", error);
    return new NextResponse("Service unavailable", { status: 503 });
  }
}
