// Run: npx tsx --test src/lib/mediaTimeout.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  SERVER_TTS_MAX_CONSECUTIVE_FAILURES,
  recordServerTtsResult,
  resetVoiceServicePrefs,
  voiceServicePrefs,
} from "./mediaTimeout";

beforeEach(() => resetVoiceServicePrefs());

test("one failed question does not switch Kokoro off for the session (fix 6.4)", () => {
  recordServerTtsResult(false);
  assert.equal(voiceServicePrefs.preferServerTts, true);
});

test("a success resets the failure count", () => {
  for (let i = 0; i < SERVER_TTS_MAX_CONSECUTIVE_FAILURES - 1; i++) recordServerTtsResult(false);
  recordServerTtsResult(true);
  for (let i = 0; i < SERVER_TTS_MAX_CONSECUTIVE_FAILURES - 1; i++) recordServerTtsResult(false);
  assert.equal(voiceServicePrefs.preferServerTts, true);
});

test("repeated failures in a row switch Kokoro off (Kokoro really down)", () => {
  for (let i = 0; i < SERVER_TTS_MAX_CONSECUTIVE_FAILURES; i++) recordServerTtsResult(false);
  assert.equal(voiceServicePrefs.preferServerTts, false);
});

test("a new interview session starts with Kokoro on and a fresh count", () => {
  for (let i = 0; i < SERVER_TTS_MAX_CONSECUTIVE_FAILURES; i++) recordServerTtsResult(false);
  resetVoiceServicePrefs();
  assert.equal(voiceServicePrefs.preferServerTts, true);
  recordServerTtsResult(false);
  assert.equal(voiceServicePrefs.preferServerTts, true);
});
