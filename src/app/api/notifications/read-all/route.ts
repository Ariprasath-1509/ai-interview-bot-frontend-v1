import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionOrRefresh } from "@/lib/session";
import { READ_BEFORE_COOKIE } from "../route";

const secure = process.env.COOKIE_SECURE === "true";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jar = await cookies();
    jar.set(READ_BEFORE_COOKIE, new Date().toISOString(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json({ error: "Failed to mark all notifications as read" }, { status: 500 });
  }
}
