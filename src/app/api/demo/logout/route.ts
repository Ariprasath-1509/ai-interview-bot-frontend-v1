import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("br_jwt", "", { path: "/", maxAge: 0 });
  res.cookies.set("br_role", "", { path: "/", maxAge: 0 });
  res.cookies.set("br_username", "", { path: "/", maxAge: 0 });
  return res;
}
