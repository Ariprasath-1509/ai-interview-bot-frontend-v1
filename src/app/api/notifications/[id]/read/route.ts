import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionOrRefresh } from "@/lib/session";
import { READ_IDS_COOKIE, pruneReadIds } from "../../route";

const secure = process.env.COOKIE_SECURE === "true";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrRefresh();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const jar = await cookies();
    const existing = (jar.get(READ_IDS_COOKIE)?.value ?? "").split(",").filter(Boolean);
    const updated = pruneReadIds(existing.includes(id) ? existing : [...existing, id]);

    jar.set(READ_IDS_COOKIE, updated.join(","), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}
