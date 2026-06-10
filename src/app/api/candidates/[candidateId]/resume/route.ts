import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "RECRUITER"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_ROLES.has(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { candidateId } = await params;
    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append("resume", file);
    backendFormData.append("candidateId", candidateId);

    const response = await fetch(`${GATEWAY}/resumes/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      body: backendFormData,
    });

    const text = await response.text();
    let result: Record<string, unknown> = {};
    if (text.trim()) {
      try {
        result = JSON.parse(text) as Record<string, unknown>;
      } catch {
        result = { error: text };
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: (result.error as string) || "Upload failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
