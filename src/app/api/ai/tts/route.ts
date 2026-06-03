import { cookies } from "next/headers";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return Response.json({ error: "text_required" }, { status: 400 });

  const upstream = await fetch(`${GATEWAY}/ai/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  }).catch(() => null);

  if (!upstream) {
    return Response.json({ error: "TTS service unreachable" }, { status: 502 });
  }

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    return Response.json(err, { status: upstream.status });
  }

  const audio = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  return new Response(audio, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}
