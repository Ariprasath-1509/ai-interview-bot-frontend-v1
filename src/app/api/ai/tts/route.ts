import { cookies } from "next/headers";
import { TTS_TIMEOUT_MS } from "@/lib/mediaTimeout";

export const runtime = "nodejs";

const KOKORO_URL = process.env.KOKORO_URL?.replace(/\/$/, "");
const KOKORO_VOICE = process.env.KOKORO_VOICE ?? "af_heart";
const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return Response.json({ error: "text_required" }, { status: 400 });

  // Direct path: call Kokoro container on bench-network (skips Nginx + API Gateway + AI Service)
  if (KOKORO_URL) {
    try {
      const upstream = await fetch(`${KOKORO_URL}/v1/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "audio/wav, audio/mpeg, audio/*",
        },
        body: JSON.stringify({
          model: "kokoro",
          input: text.length > 2000 ? text.substring(0, 2000) : text,
          voice: KOKORO_VOICE,
          speed: 1.0,
          response_format: "wav",
        }),
        signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
      });

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => "");
        return Response.json(
          { error: "tts_failed", detail: errText || "Kokoro error" },
          { status: upstream.status },
        );
      }

      const audio = await upstream.arrayBuffer();
      const contentType = upstream.headers.get("content-type") ?? "audio/wav";
      return new Response(audio, {
        status: 200,
        headers: { "Content-Type": contentType },
      });
    } catch (err: unknown) {
      const isTimeout = (err as { name?: string }).name === "TimeoutError" ||
                        (err as { name?: string }).name === "AbortError";
      return Response.json(
        { error: isTimeout ? "tts_timeout" : "tts_failed",
          detail: isTimeout ? "Kokoro TTS timed out — using browser speech instead" : String(err) },
        { status: 504 },
      );
    }
  }

  // Fallback: proxy through API Gateway (used when KOKORO_URL is not configured)
  const upstream = await fetch(`${GATEWAY}/ai/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
  }).catch(() => null);

  if (!upstream) {
    return Response.json(
      { error: "tts_timeout", detail: "Kokoro TTS timed out — using browser speech instead" },
      { status: 504 },
    );
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
