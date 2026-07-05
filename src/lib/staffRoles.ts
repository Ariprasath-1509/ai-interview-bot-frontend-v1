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

/**
 * A branch code from the BRANCH master-data category (DEVELOPMENT, TESTING, or any
 * admin-added branch). Kept as a plain string rather than a fixed union since the set
 * is now managed dynamically — see src/hooks/useBranchOptions.ts for the live list.
 */
export type BranchCode = string;

function normalizeBranch(branch?: string | null): string | null {
  const trimmed = branch?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

/** Branch stored on clients, candidates, audit logs, etc. Passes through any master-data code. */
export function entityBranchCode(branch?: string | null): BranchCode {
  return normalizeBranch(branch) ?? "DEVELOPMENT";
}

function humanizeBranchCode(code: string): string {
  if (code === "TESTING") return "Testing";
  if (code === "DEVELOPMENT") return "Development";
  return code
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function entityBranchLabel(branch?: string | null): string {
  return humanizeBranchCode(entityBranchCode(branch));
}

/** DEVELOPMENT/TESTING keep their original colors; any other code gets a deterministic
 * color from this palette so it stays visually distinct and stable across renders. */
const BRANCH_BADGE_PALETTE = [
  "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
];

function badgeClassForCode(code: string): string {
  if (code === "TESTING") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  if (code === "DEVELOPMENT") return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200";
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) | 0;
  return BRANCH_BADGE_PALETTE[Math.abs(hash) % BRANCH_BADGE_PALETTE.length];
}

export function entityBranchBadgeClass(branch?: string | null): string {
  return badgeClassForCode(entityBranchCode(branch));
}

/** Conventional default branch for a role — only used when no explicit assignment exists yet. */
export function resolveStaffBranchFromRole(role: string | undefined | null): BranchCode {
  if (isTestingStaffRole(role)) return "TESTING";
  return "DEVELOPMENT";
}

/** Staff accounts: the persisted per-user branch is authoritative (backend keeps it in sync
 * on role changes); role default is only a fallback for accounts predating explicit assignment. */
export function staffBranchLabel(branch?: string | null, role?: string | null): string {
  const code = normalizeBranch(branch) ?? resolveStaffBranchFromRole(role);
  return humanizeBranchCode(code);
}

export function staffBranchBadgeClass(branch?: string | null, role?: string | null): string {
  const code = normalizeBranch(branch) ?? resolveStaffBranchFromRole(role);
  return badgeClassForCode(code);
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
    return normalizeBranch(selected) ?? "DEVELOPMENT";
  }
  return normalizeBranch(sessionBranch) ?? "DEVELOPMENT";
}

export function defaultStaffBranch(role: string | undefined | null, sessionBranch?: string | null): BranchCode {
  return resolveFormBranch(role, sessionBranch, null);
}
