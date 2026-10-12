// Run: npx tsx --test src/lib/clientIp.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIpHeader } from "./clientIp";

test("X-Real-IP present -> forwarded as a single X-Forwarded-For value", () => {
  const h = new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "203.0.113.7" });
  assert.deepEqual(clientIpHeader(h), { "X-Forwarded-For": "203.0.113.7" });
});

test("IPv6 X-Real-IP is forwarded", () => {
  assert.deepEqual(clientIpHeader(new Headers({ "x-real-ip": "2001:db8::1" })), {
    "X-Forwarded-For": "2001:db8::1",
  });
});

test("no client IP headers -> nothing sent (previous behaviour)", () => {
  assert.deepEqual(clientIpHeader(new Headers()), {});
});

test("spoofed X-Forwarded-For only -> ignored", () => {
  assert.deepEqual(clientIpHeader(new Headers({ "x-forwarded-for": "1.2.3.4" })), {});
});

test("spoofed X-Forwarded-For first element is ignored, X-Real-IP wins", () => {
  // nginx appends the real peer: client sent "1.2.3.4", nginx made "1.2.3.4, 198.51.100.9"
  const h = new Headers({ "x-real-ip": "198.51.100.9", "x-forwarded-for": "1.2.3.4, 198.51.100.9" });
  assert.deepEqual(clientIpHeader(h), { "X-Forwarded-For": "198.51.100.9" });
});

test("malformed X-Real-IP -> nothing sent", () => {
  assert.deepEqual(clientIpHeader(new Headers({ "x-real-ip": "1.2.3.4, 5.6.7.8" })), {});
  assert.deepEqual(clientIpHeader(new Headers({ "x-real-ip": "   " })), {});
  assert.deepEqual(clientIpHeader(new Headers({ "x-real-ip": "evil<script>" })), {});
});
