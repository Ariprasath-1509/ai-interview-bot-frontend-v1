import { cookies } from "next/headers";
import { MEDIA_SERVICE_TIMEOUT_MS } from "@/lib/mediaTimeout";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "multipart/form-data";
  const body = await req.arrayBuffer();

  const upstream = await fetch(`${GATEWAY}/ai/transcribe`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
    signal: AbortSignal.timeout(MEDIA_SERVICE_TIMEOUT_MS),
  }).catch((err: unknown) => {
    if ((err as { name?: string }).name === "TimeoutError") {
      return null;
    }
    return null;
  });

  if (!upstream) {
    return Response.json(
      { error: "transcribe_timeout", detail: "Whisper STT timed out — use browser speech instead" },
      { status: 504 },
    );
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const detail =
      (data as { detail?: string; message?: string; error?: string }).detail ??
      (data as { message?: string }).message ??
      (data as { error?: string }).error ??
      "Transcription failed";
    return Response.json({ error: "transcribe_failed", detail }, { status: upstream.status });
  }
  return Response.json(data, { status: upstream.status });
}
