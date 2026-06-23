export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "TESTING_ADMIN",
  "RECRUITER",
  "TESTING_RECRUITER",
  "CANDIDATE",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  TESTING_ADMIN: 80,
  RECRUITER: 60,
  TESTING_RECRUITER: 60,
  CANDIDATE: 5,
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function pickHighestRole(roles: UserRole[]): UserRole {
  return roles.sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] ?? "RECRUITER";
}

export function isStaffRole(role: string): boolean {
  return role !== "CANDIDATE";
}

export function formatRoleLabel(role: string): string {
  return role.replace(/_/g, " ");
}
