import { cookies } from "next/headers";
import { STT_ROUTE_TIMEOUT_MS, MEDIA_SERVICE_TIMEOUT_MS } from "@/lib/mediaTimeout";

export const runtime = "nodejs";

const SARVAM_API_KEY  = process.env.SARVAM_API_KEY;
const SARVAM_URL      = (process.env.SARVAM_URL ?? "https://api.sarvam.ai").replace(/\/$/, "");
const SARVAM_MODEL    = process.env.SARVAM_MODEL ?? "saarika:v2";
const WHISPER_URL     = process.env.WHISPER_URL?.replace(/\/$/, "");
const GATEWAY         = process.env.API_URL ?? "http://localhost:6002";

// Map simple ISO codes (sent by the frontend language selector) to Sarvam's BCP-47 codes.
const SARVAM_LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  or: "or-IN",
};

function toSarvamLang(lang: string | null): string | null {
  if (!lang || lang === "auto") return null;
  return SARVAM_LANG_MAP[lang] ?? (lang.includes("-") ? lang : `${lang}-IN`);
}

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const incomingForm = await req.formData();
  const audioField   = incomingForm.get("audio");
  const language     = incomingForm.get("language") as string | null;

  if (!audioField || !(audioField instanceof Blob)) {
    return Response.json({ error: "audio_required" }, { status: 400 });
  }

  // ── 1. Sarvam STT (primary) ──────────────────────────────────────────────
  if (SARVAM_API_KEY) {
    try {
      const sarvamForm = new FormData();
      sarvamForm.append("file", audioField, (audioField as File).name ?? "answer.webm");
      sarvamForm.append("model", SARVAM_MODEL);
      const sarvamLang = toSarvamLang(language);
      if (sarvamLang) sarvamForm.append("language_code", sarvamLang);

      const sarvamRes = await fetch(`${SARVAM_URL}/speech-to-text`, {
        method: "POST",
        headers: { "api-subscription-key": SARVAM_API_KEY },
        body: sarvamForm,
        signal: AbortSignal.timeout(30_000), // Sarvam is fast — tight timeout before fallback
      });

      if (sarvamRes.ok) {
        const data = await sarvamRes.json() as { transcript?: string; language_code?: string };
        return Response.json({
          text:     data.transcript ?? "",
          language: data.language_code ?? sarvamLang ?? "en-IN",
          provider: "sarvam",
        });
      }

      // Non-200 from Sarvam — log and fall through to Whisper
      const errBody = await sarvamRes.text().catch(() => "");
      console.warn("[STT] Sarvam returned", sarvamRes.status, errBody, "— falling back to Whisper");
    } catch (err) {
      const isTimeout = (err as { name?: string }).name === "TimeoutError" ||
                        (err as { name?: string }).name === "AbortError";
      console.warn("[STT] Sarvam", isTimeout ? "timed out" : "failed:", err, "— falling back to Whisper");
    }
  }

  // ── 2. Faster-Whisper (fallback / default when no Sarvam key) ────────────
  if (WHISPER_URL) {
    try {
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
        text:     data.text ?? "",
        language: data.language ?? (language ?? "en"),
        provider: "faster-whisper",
      });
    } catch (err: unknown) {
      const isTimeout = (err as { name?: string }).name === "TimeoutError" ||
                        (err as { name?: string }).name === "AbortError";
      return Response.json(
        {
          error:  isTimeout ? "transcribe_timeout" : "transcribe_failed",
          detail: isTimeout
            ? "STT timed out — use browser speech instead"
            : String(err),
        },
        { status: 504 },
      );
    }
  }

  // ── 3. Gateway proxy (when neither SARVAM_API_KEY nor WHISPER_URL is set) ─
  const contentType = req.headers.get("content-type") ?? "multipart/form-data";
  const body = await req.arrayBuffer();

  const upstream = await fetch(`${GATEWAY}/ai/transcribe`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
    signal: AbortSignal.timeout(MEDIA_SERVICE_TIMEOUT_MS),
  }).catch(() => null);

  if (!upstream) {
    return Response.json(
      { error: "transcribe_timeout", detail: "STT timed out — use browser speech instead" },
      { status: 504 },
    );
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const detail =
      (data as { detail?: string }).detail ??
      (data as { message?: string }).message ??
      (data as { error?: string }).error ??
      "Transcription failed";
    return Response.json({ error: "transcribe_failed", detail }, { status: upstream.status });
  }
  return Response.json(data, { status: upstream.status });
}
