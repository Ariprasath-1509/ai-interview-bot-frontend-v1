import { cookies } from "next/headers";
import { z } from "zod";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

async function getToken() {
  const jar = await cookies();
  return jar.get("br_jwt")?.value ?? null;
}

/** POST — candidate uploads recording after interview */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!z.string().min(1).safeParse(id).success)
    return Response.json({ error: "Missing id" }, { status: 400 });

  const contentType = req.headers.get("content-type") ?? "multipart/form-data";
  const body = await req.arrayBuffer();

  const upstream = await fetch(`${GATEWAY}/interviews/${id}/recording`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body,
  }).catch(() => null);

  if (!upstream) return Response.json({ error: "Service unreachable" }, { status: 502 });
  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}

/** GET — admin/recruiter streams the recording */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!z.string().min(1).safeParse(id).success)
    return Response.json({ error: "Missing id" }, { status: 400 });

  const upstream = await fetch(`${GATEWAY}/interviews/${id}/recording`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);

  if (!upstream) return Response.json({ error: "Service unreachable" }, { status: 502 });
  if (!upstream.ok) return new Response(null, { status: upstream.status });

  // Stream the audio back
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "audio/webm",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "inline",
    },
  });
}
