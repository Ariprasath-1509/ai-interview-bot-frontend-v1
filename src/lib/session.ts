import { cookies } from "next/headers";
import type { UserRole } from "@/server/roles";

export type Session = {
  token: string;
  role: UserRole;
  username: string;
  adminSource?: string;
  branch?: string;
  userId?: string;
};

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
  return (
    (typeof p["name"] === "string" && p["name"]) ||
    (typeof p["username"] === "string" && p["username"]) ||
    (typeof p["email"] === "string" && p["email"]) ||
    (typeof p["sub"] === "string" && p["sub"]) ||
    fallback
  );
}

function extractBranch(token: string): string | undefined {
  const p = decodeJwtPayload(token);
  const branch = p?.["branch"];
  return typeof branch === "string" && branch ? branch : undefined;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  const role = jar.get("br_role")?.value as UserRole | undefined;
  if (!token || !role) return null;
  const cookieUsername = jar.get("br_username")?.value;
  const adminSource = jar.get("br_admin_source")?.value;
  const branch = jar.get("br_branch")?.value ?? extractBranch(token);
  const username = extractUsername(token, cookieUsername ?? "User");
  const userId = extractUserId(token);
  return { token, role, username, adminSource, branch, userId };
}

export async function getToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get("br_jwt")?.value;
}
