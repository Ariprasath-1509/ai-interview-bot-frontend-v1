export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "RECRUITER",
  "CANDIDATE",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  RECRUITER: 60,
  CANDIDATE: 5,
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function pickHighestRole(roles: UserRole[]): UserRole {
  return roles.sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] ?? "RECRUITER";
}
