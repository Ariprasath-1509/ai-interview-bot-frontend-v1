import { cookies } from "next/headers";

export const runtime = "nodejs";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_PROJECT_ID = process.env.DEEPGRAM_PROJECT_ID;
const TEMP_KEY_TTL_SECONDS = 3600; // one key covers a full interview session, reused across questions

// Mints a short-lived, scoped Deepgram key so the permanent DEEPGRAM_API_KEY never reaches
// the browser. The candidate's WebSocket then authenticates directly to Deepgram using this
// temp key, avoiding the need for a WebSocket relay (Next.js standalone output has no custom
// server to host one — see plan notes).
export async function POST() {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!DEEPGRAM_API_KEY || !DEEPGRAM_PROJECT_ID) {
    // Deepgram is opt-in: if unconfigured, the client silently keeps using the
    // existing Sarvam/Whisper batch transcription flow.
    return Response.json({ error: "not_configured" }, { status: 501 });
  }

  try {
    const res = await fetch(`https://api.deepgram.com/v1/projects/${DEEPGRAM_PROJECT_ID}/keys`, {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: "live-interview-transcription (short-lived)",
        scopes: ["usage:write"],
        time_to_live_in_seconds: TEMP_KEY_TTL_SECONDS,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[Deepgram] Key mint failed", res.status, detail);
      return Response.json({ error: "deepgram_key_mint_failed" }, { status: 502 });
    }

    const data = await res.json() as { key?: string; api_key?: { key?: string } };
    const key = data.key ?? data.api_key?.key;
    if (!key) {
      return Response.json({ error: "deepgram_key_mint_failed" }, { status: 502 });
    }

    return Response.json({
      key,
      expiresAt: Date.now() + TEMP_KEY_TTL_SECONDS * 1000,
    });
  } catch (err) {
    console.warn("[Deepgram] Key mint error", err);
    return Response.json({ error: "deepgram_key_mint_failed" }, { status: 502 });
  }
}
