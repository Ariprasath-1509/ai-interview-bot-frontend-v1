import type { UserRole } from "@/server/roles";

export const STAFF_READ_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "TESTING_ADMIN",
  "RECRUITER",
  "TESTING_RECRUITER",
] as const satisfies readonly UserRole[];

export const STAFF_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "TESTING_ADMIN",
] as const satisfies readonly UserRole[];

export const STAFF_READ_ROLE_SET = new Set<string>(STAFF_READ_ROLES);
export const STAFF_ADMIN_ROLE_SET = new Set<string>(STAFF_ADMIN_ROLES);

export function isStaffReadRole(role: string | undefined | null): boolean {
  return !!role && STAFF_READ_ROLE_SET.has(role);
}

export function isStaffAdminRole(role: string | undefined | null): boolean {
  return !!role && STAFF_ADMIN_ROLE_SET.has(role);
}

export function isTestingStaffRole(role: string | undefined | null): boolean {
  return role === "TESTING_ADMIN" || role === "TESTING_RECRUITER";
}

export type BranchCode = "DEVELOPMENT" | "TESTING";

/** Branch stored on clients, candidates, audit logs, etc. */
export function entityBranchCode(branch?: string | null): BranchCode {
  return branch === "TESTING" ? "TESTING" : "DEVELOPMENT";
}

export function entityBranchLabel(branch?: string | null): string {
  return entityBranchCode(branch) === "TESTING" ? "Testing" : "Development";
}

export function entityBranchBadgeClass(branch?: string | null): string {
  if (entityBranchCode(branch) === "TESTING") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }
  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200";
}

export function resolveStaffBranchFromRole(role: string | undefined | null): BranchCode {
  if (isTestingStaffRole(role)) return "TESTING";
  return "DEVELOPMENT";
}

/** Staff accounts: prefer role mapping over stored branch (stored value can be stale after role edits). */
export function staffBranchLabel(branch?: string | null, role?: string | null): string {
  const code = role ? resolveStaffBranchFromRole(role) : entityBranchCode(branch);
  return code === "TESTING" ? "Testing" : "Development";
}

export function staffBranchBadgeClass(branch?: string | null, role?: string | null): string {
  const code = role ? resolveStaffBranchFromRole(role) : entityBranchCode(branch);
  if (code === "TESTING") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }
  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200";
}

export function canPickBranch(role: string | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}

/** Branch assigned on create forms for non–super-admin staff. */
export function resolveFormBranch(
  role: string | undefined | null,
  sessionBranch?: string | null,
  selected?: string | null
): BranchCode {
  if (canPickBranch(role)) {
    return selected === "TESTING" ? "TESTING" : "DEVELOPMENT";
  }
  return sessionBranch === "TESTING" ? "TESTING" : "DEVELOPMENT";
}

export function defaultStaffBranch(role: string | undefined | null, sessionBranch?: string | null): BranchCode {
  return resolveFormBranch(role, sessionBranch, null);
}
