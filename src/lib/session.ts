import { cookies } from "next/headers";
import type { UserRole } from "@/server/roles";
import { extractBranchFromToken, isAccessTokenExpired } from "@/lib/authCookies";
import {
  applyRefreshToCookies,
  extractUserId,
  extractUsername,
} from "@/lib/tokenRefresh";

export type Session = {
  token: string;
  role: UserRole;
  username: string;
  adminSource?: string;
  branch?: string;
  userId?: string;
};

function buildSession(
  token: string,
  role: UserRole,
  jar: Awaited<ReturnType<typeof cookies>>
): Session {
  const cookieUsername = jar.get("br_username")?.value;
  const adminSource = jar.get("br_admin_source")?.value;
  const branch = jar.get("br_branch")?.value ?? extractBranchFromToken(token);
  const username = extractUsername(token, cookieUsername ?? "User");
  const userId = extractUserId(token);
  return { token, role, username, adminSource, branch, userId };
}

/**
 * Read session from cookies. Does not refresh — use getSessionOrRefresh in API routes,
 * or rely on middleware for page navigations.
 */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  const role = jar.get("br_role")?.value as UserRole | undefined;
  if (!token || !role) return null;
  if (isAccessTokenExpired(token)) return null;
  return buildSession(token, role, jar);
}

/**
 * Returns a valid session, refreshing tokens when the access token is expired.
 * Safe to call from Route Handlers and Server Actions (can write cookies).
 */
export async function getSessionOrRefresh(): Promise<Session | null> {
  const jar = await cookies();
  let token = jar.get("br_jwt")?.value;
  let role = jar.get("br_role")?.value as UserRole | undefined;
  const refresh = jar.get("br_refresh")?.value;

  if (!token || !role) {
    if (refresh) {
      const refreshed = await applyRefreshToCookies(jar, refresh);
      if (!refreshed) return null;
      token = jar.get("br_jwt")?.value;
      role = jar.get("br_role")?.value as UserRole | undefined;
    }
    if (!token || !role) return null;
    return buildSession(token, role, jar);
  }

  if (isAccessTokenExpired(token)) {
    if (!refresh) return null;
    const refreshed = await applyRefreshToCookies(jar, refresh);
    if (!refreshed) return null;
    token = jar.get("br_jwt")?.value;
    role = jar.get("br_role")?.value as UserRole | undefined;
    if (!token || !role) return null;
  }

  return buildSession(token, role, jar);
}

export async function getToken(): Promise<string | undefined> {
  const session = await getSessionOrRefresh();
  return session?.token;
}
