// Run: npx tsx --test src/app/interview/assessmentPolling.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSESS_WAIT_MS, nextPollDelayMs, retryAfterMs, waitForAssessment } from "./assessmentPolling";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** Fake clock: sleep() advances time instantly and records each wait. */
function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return {
    sleeps,
    now: () => t,
    sleep: async (ms: number) => { sleeps.push(ms); t += ms; },
  };
}

test("backoff grows ×1.5 and caps at 15 s", () => {
  assert.equal(nextPollDelayMs(3000), 4500);
  assert.equal(nextPollDelayMs(10_000), 15_000);
  assert.equal(nextPollDelayMs(15_000), 15_000);
});

test("Retry-After is parsed and clamped", () => {
  assert.equal(retryAfterMs("30"), 30_000);
  assert.equal(retryAfterMs("1"), 5_000);
  assert.equal(retryAfterMs("999"), 60_000);
  assert.equal(retryAfterMs(null), 30_000);
  assert.equal(retryAfterMs("soon"), 30_000);
});

test("completes after scoring takes longer than the old 90 s window", async () => {
  const clock = fakeClock();
  const result = await waitForAssessment<{ score: number }>({
    ...clock,
    start: async () => json({ status: "ASSESSMENT_PENDING", runId: "r1" }),
    fetchStatus: async (runId) => {
      assert.equal(runId, "r1");
      return clock.now() < 150_000
        ? json({ status: "PROCESSING", runId: "r1" })
        : json({ status: "COMPLETED", runId: "r1", result: { score: 4 } });
    },
  });
  assert.deepEqual(result, { kind: "completed", result: { score: 4 } });
  assert.equal(clock.sleeps[0], 3000);
  assert.ok(Math.max(...clock.sleeps) <= 15_000);
});

test("COMPLETED from another runId is ignored", async () => {
  const clock = fakeClock();
  let polls = 0;
  const result = await waitForAssessment<{ score: number }>({
    ...clock,
    start: async () => json({ runId: "r2" }),
    fetchStatus: async () => {
      polls++;
      return polls === 1
        ? json({ status: "COMPLETED", runId: "r1", result: { score: 1 } })
        : json({ status: "COMPLETED", runId: "r2", result: { score: 5 } });
    },
  });
  assert.deepEqual(result, { kind: "completed", result: { score: 5 } });
});

test("FAILED is returned with the backend reason", async () => {
  const clock = fakeClock();
  const result = await waitForAssessment({
    ...clock,
    start: async () => json({ runId: "r1" }),
    fetchStatus: async () => json({ status: "FAILED", runId: "r1", error: "STALE_TIMEOUT" }),
  });
  assert.deepEqual(result, { kind: "failed", error: "STALE_TIMEOUT" });
});

test("503 on start is retried after Retry-After, then succeeds", async () => {
  const clock = fakeClock();
  let starts = 0;
  const result = await waitForAssessment<{ score: number }>({
    ...clock,
    start: async () => (++starts === 1
      ? json({ status: "FAILED", error: "QUEUE_FULL" }, 503, { "retry-after": "30" })
      : json({ runId: "r1" })),
    fetchStatus: async () => json({ status: "COMPLETED", runId: "r1", result: { score: 3 } }),
  });
  assert.equal(starts, 2);
  assert.equal(clock.sleeps[0], 30_000);
  assert.deepEqual(result, { kind: "completed", result: { score: 3 } });
});

test("503 until the deadline -> failed QUEUE_FULL", async () => {
  const clock = fakeClock();
  const result = await waitForAssessment({
    ...clock,
    start: async () => json({ error: "QUEUE_FULL" }, 503, { "retry-after": "30" }),
    fetchStatus: async () => assert.fail("must not poll"),
  });
  assert.deepEqual(result, { kind: "failed", error: "QUEUE_FULL" });
  assert.ok(clock.now() < ASSESS_WAIT_MS);
});

test("transient poll errors (503, network) keep polling; gives up at ~300 s", async () => {
  const clock = fakeClock();
  let polls = 0;
  const result = await waitForAssessment({
    ...clock,
    start: async () => json({ runId: "r1" }),
    fetchStatus: async () => {
      polls++;
      return polls % 2 ? json({}, 503) : null;
    },
  });
  assert.deepEqual(result, { kind: "timeout" });
  assert.equal(clock.now(), ASSESS_WAIT_MS);
  assert.ok(polls > 18 && polls < 40, `polls=${polls}`);
});

test("start request failure (not 503) -> timeout, as before", async () => {
  const clock = fakeClock();
  const result = await waitForAssessment({
    ...clock,
    start: async () => null,
    fetchStatus: async () => assert.fail("must not poll"),
  });
  assert.deepEqual(result, { kind: "timeout" });
});
