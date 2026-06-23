import { cookies } from "next/headers";
import { z } from "zod";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!z.string().min(1).safeParse(id).success) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") ?? "multipart/form-data";
  const body = await req.arrayBuffer();

  const upstream = await fetch(`${GATEWAY}/interviews/${id}/proctoring/snapshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
  }).catch(() => null);

  if (!upstream) return Response.json({ error: "Service unreachable" }, { status: 502 });
  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}
