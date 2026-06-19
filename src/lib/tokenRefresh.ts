import {
  AuthTokenPayload,
  clearAuthCookies,
  decodeJwtPayload,
  extractAdminSourceFromToken,
  extractBranchFromToken,
  extractRoleFromToken,
  isAccessTokenExpired,
  setAuthCookies,
} from "@/lib/authCookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const GATEWAY = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

async function parseJsonBody<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function refreshAuthTokens(refreshToken: string): Promise<AuthTokenPayload | null> {
  try {
    const res = await fetch(`${GATEWAY}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await parseJsonBody<AuthTokenPayload & { ok?: boolean }>(res);
    if (!data?.token || !data?.refreshToken) return null;
    return data;
  } catch {
    return null;
  }
}

export async function applyRefreshToCookies(
  jar: ReadonlyRequestCookies,
  refreshToken: string
): Promise<AuthTokenPayload | null> {
  const refreshed = await refreshAuthTokens(refreshToken);
  if (!refreshed) {
    clearAuthCookies(jar);
    return null;
  }

  setAuthCookies(jar, refreshed, {
    role: jar.get("br_role")?.value,
    name: jar.get("br_username")?.value,
    adminSource: jar.get("br_admin_source")?.value ?? extractAdminSourceFromToken(refreshed.token),
    branch: jar.get("br_branch")?.value ?? extractBranchFromToken(refreshed.token),
  });
  return refreshed;
}

export function extractUserId(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  if (!payload) return undefined;
  return (
    (typeof payload.userId === "string" && payload.userId) ||
    (typeof payload.id === "string" && payload.id) ||
    (typeof payload.sub === "string" && payload.sub) ||
    undefined
  );
}

export function extractUsername(token: string, fallback: string): string {
  const payload = decodeJwtPayload(token);
  if (!payload) return fallback;
  return (
    (typeof payload.name === "string" && payload.name) ||
    (typeof payload.username === "string" && payload.username) ||
    (typeof payload.email === "string" && payload.email) ||
    (typeof payload.sub === "string" && payload.sub) ||
    fallback
  );
}

export { isAccessTokenExpired };
