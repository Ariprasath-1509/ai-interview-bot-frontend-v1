import { cookies } from "next/headers";

export const runtime = "nodejs";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const GRANT_TTL_SECONDS = 120; // covers one answer; a fresh token is minted per recording

// Mints a short-lived JWT via Deepgram's token-grant endpoint so the permanent
// DEEPGRAM_API_KEY never reaches the browser. Uses /v1/auth/grant — purpose-built
// for "short-lived tokens for /Listen... requests" and only needs a standard
// Member-level key — NOT the older /v1/projects/{id}/keys management endpoint,
// which needs elevated `keys:write` project permission and no longer needs a
// project ID configured at all.
export async function POST() {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!DEEPGRAM_API_KEY) {
    // Deepgram is opt-in: if unconfigured, the client silently keeps using the
    // existing Sarvam/Whisper batch transcription flow.
    return Response.json({ error: "not_configured" }, { status: 501 });
  }

  try {
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: GRANT_TTL_SECONDS }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[Deepgram] Token grant failed", res.status, detail);
      return Response.json({ error: "deepgram_token_grant_failed" }, { status: 502 });
    }

    const data = await res.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      console.warn("[Deepgram] Token grant response missing access_token", data);
      return Response.json({ error: "deepgram_token_grant_failed" }, { status: 502 });
    }

    return Response.json({
      key: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? GRANT_TTL_SECONDS) * 1000,
    });
  } catch (err) {
    console.warn("[Deepgram] Token grant error", err);
    return Response.json({ error: "deepgram_token_grant_failed" }, { status: 502 });
  }
}
