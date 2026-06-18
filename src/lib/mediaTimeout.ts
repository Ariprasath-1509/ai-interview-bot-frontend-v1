/** Max wait for Whisper STT / Coqui TTS before falling back to browser speech. */
export const MEDIA_SERVICE_TIMEOUT_MS = 10_000;

export class MediaServiceTimeoutError extends Error {
  constructor(message = "Media service timed out") {
    super(message);
    this.name = "MediaServiceTimeoutError";
  }
}

/** Shared session prefs — updated when server STT/TTS times out or fails. */
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
