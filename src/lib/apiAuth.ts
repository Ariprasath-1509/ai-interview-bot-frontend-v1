import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/server/roles";
import type { Session } from "@/lib/session";
import { STAFF_ADMIN_ROLES, STAFF_READ_ROLES } from "@/lib/staffRoles";

type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

/**
 * Standardized API route auth guard.
 * Checks session exists and optionally validates role.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}

export async function requireStaffRead(): Promise<AuthResult> {
  return requireAuth([...STAFF_READ_ROLES]);
}

export async function requireStaffAdmin(): Promise<AuthResult> {
  return requireAuth([...STAFF_ADMIN_ROLES]);
}
