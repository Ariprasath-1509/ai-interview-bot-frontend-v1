import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const { branch: selectedBranch, ...candidateBody } = body;
  const branch = (typeof selectedBranch === "string" && selectedBranch) ? selectedBranch : (session.branch ?? "DEVELOPMENT");

  const res = await fetch(`${GATEWAY}/auth/candidates/market`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.token}`,
      "Content-Type": "application/json",
      "X-User-Branch": branch,
    },
    body: JSON.stringify(candidateBody),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
