import { cookies } from "next/headers";
import type { UserRole } from "@/server/roles";

export type Session = { token: string; role: UserRole; username: string; adminSource?: string; userId?: string };

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch { return null; }
}

function extractUserId(token: string): string | undefined {
  const p = decodeJwtPayload(token);
  if (!p) return undefined;
  // common JWT claims for user ID
  return (
    (typeof p["userId"] === "string" && p["userId"]) ||
    (typeof p["id"] === "string" && p["id"]) ||
    (typeof p["sub"] === "string" && p["sub"]) ||
    undefined
  );
}

function extractUsername(token: string, fallback: string): string {
  const p = decodeJwtPayload(token);
  if (!p) return fallback;
  // common JWT claims for name/username
  return (
    (typeof p["name"] === "string" && p["name"]) ||
    (typeof p["username"] === "string" && p["username"]) ||
    (typeof p["email"] === "string" && p["email"]) ||
    (typeof p["sub"] === "string" && p["sub"]) ||
    fallback
  );
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  const role = jar.get("br_role")?.value as UserRole | undefined;
  if (!token || !role) return null;
  const cookieUsername = jar.get("br_username")?.value;
  const adminSource = jar.get("br_admin_source")?.value;
  const username = extractUsername(token, cookieUsername ?? "User");
  const userId = extractUserId(token);
  return { token, role, username, adminSource, userId };
}

export async function getToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get("br_jwt")?.value;
}
