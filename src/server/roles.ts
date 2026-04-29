export const USER_ROLES = [
  "BENCH_MANAGER",
  "ADMIN",
  "INTERVIEWER",
  "HR",
  "COMPLIANCE",
  "CANDIDATE",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_RANK: Record<UserRole, number> = {
  ADMIN: 100,
  BENCH_MANAGER: 80,
  INTERVIEWER: 60,
  HR: 50,
  COMPLIANCE: 70,
  CANDIDATE: 5,
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function pickHighestRole(roles: UserRole[]): UserRole {
  return roles.sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] ?? "INTERVIEWER";
}

