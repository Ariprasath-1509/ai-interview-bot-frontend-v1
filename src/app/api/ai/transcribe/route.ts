import { cookies } from "next/headers";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Forward the multipart body as-is to the gateway
  const contentType = req.headers.get("content-type") ?? "multipart/form-data";
  const body = await req.arrayBuffer();

  const upstream = await fetch(`${GATEWAY}/ai/transcribe`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
  }).catch(() => null);

  if (!upstream) return Response.json({ error: "STT service unreachable" }, { status: 502 });

  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}
