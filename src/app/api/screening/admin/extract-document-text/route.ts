import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";
import { isStaffReadRole } from "@/lib/staffRoles";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session || !isStaffReadRole(session.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const response = await fetch(`${GATEWAY}/screening/admin/extract-document-text`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "X-User-Role": session.role,
        ...(session.userId ? { "X-User-Id": session.userId } : {}),
        ...(session.username ? { "X-User-Name": session.username } : {}),
      },
      body: formData,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[screening extract-document-text] proxy error:", error);
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }
}
