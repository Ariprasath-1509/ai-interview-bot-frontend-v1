import { cookies } from "next/headers";
import { z } from "zod";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!z.string().min(1).safeParse(id).success) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const upstream = await fetch(`${GATEWAY}/interviews/${id}/proctoring/timeline`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) return Response.json({ error: "Service unreachable" }, { status: 502 });
  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}
