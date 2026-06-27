import { cookies } from "next/headers";

export const runtime = "nodejs";

const WHISPER_URL = process.env.WHISPER_URL?.replace(/\/$/, "");
const KOKORO_URL = process.env.KOKORO_URL?.replace(/\/$/, "");
const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Direct path: check Whisper and Kokoro health on bench-network
  if (WHISPER_URL && KOKORO_URL) {
    const [whisperRes, kokoroRes] = await Promise.allSettled([
      fetch(`${WHISPER_URL}/health`, { signal: AbortSignal.timeout(5_000) }),
      fetch(`${KOKORO_URL}/health`, { signal: AbortSignal.timeout(5_000) }),
    ]);

    const whisperOk = whisperRes.status === "fulfilled" && whisperRes.value.ok;
    const kokoroOk = kokoroRes.status === "fulfilled" && kokoroRes.value.ok;

    return Response.json({
      mediaReady: whisperOk && kokoroOk,
      sttReady: whisperOk,
      ttsReady: kokoroOk,
      sttProvider: "faster-whisper",
      ttsProvider: "kokoro",
      routing: "direct",
    });
  }

  // Fallback: proxy through API Gateway
  const upstream = await fetch(`${GATEWAY}/ai/media-health`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    return Response.json({ error: "AI service unreachable", mediaReady: false }, { status: 502 });
  }

  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}
