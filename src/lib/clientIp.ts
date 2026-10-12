import { headers } from "next/headers";

// IPv4 / IPv6 characters only; anything else is ignored rather than forwarded.
const IP_PATTERN = /^[0-9A-Fa-f:.]{2,45}$/;

/**
 * Header to send to the gateway so its auth rate limit keys on the real client,
 * not on this Next.js server. Uses X-Real-IP (set by nginx from the TCP peer);
 * the incoming X-Forwarded-For is ignored because clients can pre-fill it.
 * Returns {} when no usable IP is present.
 */
export function clientIpHeader(source: Headers): Record<string, string> {
  const ip = source.get("x-real-ip")?.trim();
  return ip && IP_PATTERN.test(ip) ? { "X-Forwarded-For": ip } : {};
}

/** Same as clientIpHeader, for code without the Request object (uses next/headers). */
export async function clientIpHeaderFromRequest(): Promise<Record<string, string>> {
  try {
    return clientIpHeader(await headers());
  } catch {
    return {};
  }
}
