import { cookies } from "next/headers";
import { STT_ROUTE_TIMEOUT_MS, MEDIA_SERVICE_TIMEOUT_MS } from "@/lib/mediaTimeout";

export const runtime = "nodejs";

const WHISPER_URL = process.env.WHISPER_URL?.replace(/\/$/, "");
const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Direct path: call Whisper container on bench-network (skips Nginx + API Gateway + AI Service)
  if (WHISPER_URL) {
    try {
      const incomingForm = await req.formData();
      const audioField = incomingForm.get("audio");
      const language = incomingForm.get("language") as string | null;

      if (!audioField || !(audioField instanceof Blob)) {
        return Response.json({ error: "audio_required" }, { status: 400 });
      }

      // Whisper expects the field named "file", not "audio"
      const whisperForm = new FormData();
      whisperForm.append("file", audioField, (audioField as File).name ?? "answer.webm");
      if (language && language !== "auto") {
        whisperForm.append("language", language);
      }

      const upstream = await fetch(`${WHISPER_URL}/v1/audio/transcriptions`, {
        method: "POST",
        body: whisperForm,
        signal: AbortSignal.timeout(STT_ROUTE_TIMEOUT_MS),
      });

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => "");
        return Response.json(
          { error: "transcribe_failed", detail: errText || "Whisper error" },
          { status: upstream.status },
        );
      }

      const data = await upstream.json() as { text?: string; language?: string };
      return Response.json({
        text: data.text ?? "",
        language: data.language ?? (language ?? "en"),
        provider: "faster-whisper",
      });
    } catch (err: unknown) {
      const isTimeout = (err as { name?: string }).name === "TimeoutError" ||
                        (err as { name?: string }).name === "AbortError";
      return Response.json(
        { error: isTimeout ? "transcribe_timeout" : "transcribe_failed",
          detail: isTimeout ? "Whisper STT timed out — use browser speech instead" : String(err) },
        { status: 504 },
      );
    }
  }

  // Fallback: proxy through API Gateway (used when WHISPER_URL is not configured)
  const contentType = req.headers.get("content-type") ?? "multipart/form-data";
  const body = await req.arrayBuffer();

  const upstream = await fetch(`${GATEWAY}/ai/transcribe`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
    signal: AbortSignal.timeout(STT_ROUTE_TIMEOUT_MS),
  }).catch(() => null);

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
