/**
 * Waits for the async AI assessment started by "Mark complete" (fix 6.7).
 *
 * - Scoring takes ~15–20 s plus queue time, so we wait up to ASSESS_WAIT_MS (nginx proxy_read_timeout is 600 s).
 * - Polls back off gently: 3 s, then ×1.5 up to 15 s.
 * - 503 from /ai/assess-async means the scoring queue is full (BE fix 6.1); retried after Retry-After while time remains.
 * - A COMPLETED result from a different runId is ignored (an older/newer run), as before.
 */

export const ASSESS_WAIT_MS = 300_000;
const FIRST_POLL_DELAY_MS = 3_000;
const MAX_POLL_DELAY_MS = 15_000;
const DEFAULT_RETRY_AFTER_MS = 30_000;

export type AssessStatusPayload<R> = {
  status?: string;
  result?: R;
  error?: string;
  runId?: string;
};

export type AssessOutcome<R> =
  | { kind: "completed"; result: R }
  | { kind: "failed"; error: string }
  | { kind: "timeout" };

export type AssessDeps = {
  /** POST /ai/assess-async; null when the request itself failed. */
  start: () => Promise<Response | null>;
  /** GET /ai/assess-status; null when the request failed. */
  fetchStatus: (runId: string | undefined) => Promise<Response | null>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  waitMs?: number;
};

export function nextPollDelayMs(prevMs: number): number {
  return Math.min(Math.round(prevMs * 1.5), MAX_POLL_DELAY_MS);
}

/** Retry-After in seconds (the BE sends 30), clamped to 5–60 s. */
export function retryAfterMs(header: string | null): number {
  const seconds = Number(header);
  if (!header || !Number.isFinite(seconds) || seconds <= 0) return DEFAULT_RETRY_AFTER_MS;
  return Math.min(Math.max(seconds, 5), 60) * 1000;
}

/** Text stored in the transcript meta and shown on the review / feedback pages. */
export function assessFailureSummary(error: string): string {
  if (error === "QUEUE_FULL") {
    return "AI scoring was busy and could not start. A reviewer can re-run assessment from the review page.";
  }
  if (error === "timeout") {
    return "AI assessment is still running or timed out. A reviewer can re-run assessment from the review page.";
  }
  return "AI assessment failed. A reviewer can re-run assessment from the review page.";
}

export async function waitForAssessment<R>(deps: AssessDeps): Promise<AssessOutcome<R>> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = deps.now ?? Date.now;
  const deadline = now() + (deps.waitMs ?? ASSESS_WAIT_MS);

  // Start; retry a full queue (503) while there is time left.
  let started = await deps.start();
  while (started?.status === 503) {
    const waitMs = retryAfterMs(started.headers.get("retry-after"));
    if (now() + waitMs >= deadline) return { kind: "failed", error: "QUEUE_FULL" };
    await sleep(waitMs);
    started = await deps.start();
  }
  if (!started?.ok) return { kind: "timeout" };

  const { runId } = (await started.json().catch(() => ({}))) as { runId?: string };

  let delayMs = FIRST_POLL_DELAY_MS;
  while (now() < deadline) {
    await sleep(Math.min(delayMs, Math.max(0, deadline - now())));
    delayMs = nextPollDelayMs(delayMs);

    // Network errors and 5xx/503 from the gateway are transient: keep polling.
    const res = await deps.fetchStatus(runId);
    if (!res?.ok) continue;
    const status = (await res.json().catch(() => ({}))) as AssessStatusPayload<R>;
    if (status.status === "COMPLETED" && status.result) {
      if (runId && status.runId && status.runId !== runId) continue;
      return { kind: "completed", result: status.result };
    }
    if (status.status === "FAILED") {
      return { kind: "failed", error: status.error ?? "failed" };
    }
  }
  return { kind: "timeout" };
}
