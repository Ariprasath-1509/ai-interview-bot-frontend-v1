import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { NextResponse } from "next/server";

export type AuthTokenPayload = {
  token: string;
  refreshToken: string;
  expiresIn?: number;
  role?: string;
  name?: string;
  adminSource?: string;
  branch?: string;
};

type CookieJar = ReadonlyRequestCookies | ResponseCookies;

const secure = process.env.NODE_ENV === "production";

export const AUTH_HTTP_ONLY = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
};

export const AUTH_VISIBLE = {
  path: "/",
  httpOnly: false,
  sameSite: "lax" as const,
  secure,
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  return atob(padded);
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractRoleFromToken(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  const role = payload?.role;
  return typeof role === "string" && role ? role : undefined;
}

export function extractBranchFromToken(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  const branch = payload?.branch;
  return typeof branch === "string" && branch ? branch : undefined;
}

export function extractAdminSourceFromToken(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  const adminSource = payload?.adminSource;
  return typeof adminSource === "string" && adminSource ? adminSource : undefined;
}

export function getAccessTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

export function isAccessTokenExpired(token: string, skewMs = 60_000): boolean {
  const expMs = getAccessTokenExpiryMs(token);
  if (expMs == null) return true;
  return Date.now() >= expMs - skewMs;
}

export function setAuthCookies(jar: CookieJar, data: AuthTokenPayload, existing?: Partial<AuthTokenPayload>) {
  jar.set("br_jwt", data.token, AUTH_HTTP_ONLY);
  jar.set("br_refresh", data.refreshToken, AUTH_HTTP_ONLY);

  const role = data.role ?? existing?.role ?? extractRoleFromToken(data.token) ?? "CANDIDATE";
  jar.set("br_role", role, AUTH_HTTP_ONLY);

  const username = data.name ?? existing?.name ?? "";
  if (username) {
    jar.set("br_username", username, AUTH_VISIBLE);
  }

  jar.set("br_issued", Date.now().toString(), AUTH_VISIBLE);

  const adminSource = data.adminSource ?? existing?.adminSource ?? extractAdminSourceFromToken(data.token);
  if (adminSource) {
    jar.set("br_admin_source", adminSource, AUTH_VISIBLE);
  }

  const branch = data.branch ?? existing?.branch ?? extractBranchFromToken(data.token);
  if (branch) {
    jar.set("br_branch", branch, AUTH_VISIBLE);
  }
}

export function clearAuthCookies(jar: CookieJar) {
  const cleared = { ...AUTH_HTTP_ONLY, maxAge: 0 };
  jar.set("br_jwt", "", cleared);
  jar.set("br_refresh", "", cleared);
  jar.set("br_role", "", cleared);
  jar.set("br_username", "", { ...AUTH_VISIBLE, maxAge: 0 });
  jar.set("br_issued", "", { ...AUTH_VISIBLE, maxAge: 0 });
  jar.set("br_admin_source", "", { ...AUTH_VISIBLE, maxAge: 0 });
  jar.set("br_branch", "", { ...AUTH_VISIBLE, maxAge: 0 });
}

export function clearAuthCookiesOnResponse(response: NextResponse) {
  clearAuthCookies(response.cookies);
}
