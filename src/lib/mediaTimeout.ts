/** Max wait for Whisper STT before falling back to browser speech.
 *  large-v3 on CPU with int8 takes 20-40 s for a typical answer clip.
 *  Keep the server-side route timeout LOWER than this so the route can
 *  return a clean 504 before the client's fetch aborts mid-stream. */
export const MEDIA_SERVICE_TIMEOUT_MS = 90_000;
export const STT_ROUTE_TIMEOUT_MS = 80_000; // used server-side so it fires before the client cuts off

/** Max wait for Kokoro TTS — longer because first request triggers model warmup. */
export const TTS_TIMEOUT_MS = 45_000;

/** Client-side TTS fetch timeout — fall back to browser speech if Kokoro doesn't start within this window. */
export const TTS_SPEAK_TIMEOUT_MS = 12_000;

export class MediaServiceTimeoutError extends Error {
  constructor(message = "Media service timed out") {
    super(message);
    this.name = "MediaServiceTimeoutError";
  }
}

/** Shared session prefs — server Whisper STT for accuracy; Kokoro TTS for natural voice. */
export const voiceServicePrefs = {
  preferServerStt: true,
  preferServerTts: true,
};

export function resetVoiceServicePrefs() {
  voiceServicePrefs.preferServerStt = true;
  voiceServicePrefs.preferServerTts = true;
}

export function isUsingBrowserVoiceFallback() {
  return !voiceServicePrefs.preferServerStt || !voiceServicePrefs.preferServerTts;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = MEDIA_SERVICE_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      throw new MediaServiceTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
