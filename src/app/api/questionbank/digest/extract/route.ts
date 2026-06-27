import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

export const dynamic = "force-dynamic";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append("file", file, (file as File).name ?? "upload.docx");

    const response = await fetch(`${GATEWAY}/questionbank/api/digest/extract`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      body: upstream,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Digest extract error:", error);
    return NextResponse.json({ success: false, message: "Text extraction failed" }, { status: 503 });
  }
}
