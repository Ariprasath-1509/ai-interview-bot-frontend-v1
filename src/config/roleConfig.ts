import type { UserRole } from "@/server/roles";
import type { FeatureKey } from "@/app/admin/organizations/types";

export type SidebarItem = {
  href: string;
  label: string;
  icon: string; // Changed to string icon name
  /** Consecutive items with the same key render in one collapsible group */
  navGroup?: "candidates" | "clients" | "masterData";
};

export type Permission =
  | "dashboard.view"
  | "interviews.create"
  | "interviews.review"
  | "interviews.delete"
  | "interviews.signoff"
  | "interviews.observe"
  | "interviews.inject"
  | "interviews.flag"
  | "candidates.view"
  | "candidates.update"
  | "candidates.bulk_import"
  | "clients.manage"
  | "matching.view"
  | "staff.manage"
  | "tokens.manage"
  | "compliance.view"
  | "masterdata.view"
  | "masterdata.manage"
  | "analytics.view"
  | "profile.view"
  | "profile.edit"
  | "feedback.view"
  | "notifications.view"
  | "calendar.view"
  | "resume.upload";

export type RoleConfigEntry = {
  sidebar: SidebarItem[];
  permissions: Permission[];
  defaultRoute: string;
};

export const roleConfig: Record<UserRole, RoleConfigEntry> = {
  SUPER_ADMIN: {
    defaultRoute: "/admin",
    sidebar: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/interviews/create", label: "Create Interview", icon: "UserPlus" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/screening", label: "Screening", icon: "FileCheck2" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users", navGroup: "candidates" },
      { href: "/admin/candidates/bulk-import", label: "Bulk Import", icon: "Upload", navGroup: "candidates" },
      { href: "/admin/candidates/deployment-bulk-import", label: "Deployment Import", icon: "Briefcase", navGroup: "candidates" },
      { href: "/admin/clients", label: "Clients", icon: "Building2", navGroup: "clients" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/admin/profile", label: "Profile", icon: "User" },
      { href: "/admin/organizations", label: "Organizations", icon: "Globe" },
      { href: "/admin/staff", label: "Manage Staff", icon: "Shield" },
      { href: "/admin/settings", label: "Settings", icon: "Settings" },
      { href: "/admin/compliance", label: "Compliance", icon: "Eye" },
      { href: "/admin/master-data", label: "Overview", icon: "SlidersHorizontal", navGroup: "masterData" },
      { href: "/admin/master-data/lookups", label: "Lookup Values", icon: "ListTree", navGroup: "masterData" },
      { href: "/admin/master-data/categories", label: "QB Categories", icon: "Layers", navGroup: "masterData" },
      { href: "/admin/master-data/tags", label: "QB Tags", icon: "Tag", navGroup: "masterData" },
      { href: "/admin/master-data/companies", label: "QB Companies", icon: "Building2", navGroup: "masterData" },
      { href: "/admin/questionbank", label: "QuestionBank", icon: "Database" },
    ],
    // Question bank content is shared globally across branches (initial rollout).
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.signoff", "interviews.observe", "interviews.inject", "interviews.flag",
      "candidates.view", "candidates.update", "candidates.bulk_import", "clients.manage", "matching.view",
      "staff.manage", "tokens.manage", "compliance.view", "masterdata.view", "masterdata.manage", "analytics.view", "calendar.view",
      "profile.view", "profile.edit",
    ],
  },
  ADMIN: {
    defaultRoute: "/admin",
    sidebar: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/interviews/create", label: "Create Interview", icon: "UserPlus" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/screening", label: "Screening", icon: "FileCheck2" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users", navGroup: "candidates" },
      { href: "/admin/candidates/bulk-import", label: "Bulk Import", icon: "Upload", navGroup: "candidates" },
      { href: "/admin/candidates/deployment-bulk-import", label: "Deployment Import", icon: "Briefcase", navGroup: "candidates" },
      { href: "/admin/clients", label: "Clients", icon: "Building2", navGroup: "clients" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/admin/profile", label: "Profile", icon: "User" },
      { href: "/admin/staff", label: "Manage Staff", icon: "Shield" },
      { href: "/admin/compliance", label: "Compliance", icon: "Eye" },
      { href: "/admin/master-data", label: "Overview", icon: "SlidersHorizontal", navGroup: "masterData" },
      { href: "/admin/master-data/lookups", label: "Lookup Values", icon: "ListTree", navGroup: "masterData" },
      { href: "/admin/master-data/categories", label: "QB Categories", icon: "Layers", navGroup: "masterData" },
      { href: "/admin/master-data/tags", label: "QB Tags", icon: "Tag", navGroup: "masterData" },
      { href: "/admin/master-data/companies", label: "QB Companies", icon: "Building2", navGroup: "masterData" },
      { href: "/admin/questionbank", label: "QuestionBank", icon: "Database" },
    ],
    // Question bank content is shared globally across branches (initial rollout).
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.signoff", "interviews.observe", "interviews.inject", "interviews.flag",
      "candidates.view", "candidates.update", "candidates.bulk_import", "clients.manage", "matching.view",
      "staff.manage", "compliance.view", "masterdata.view", "analytics.view", "calendar.view",
      "profile.view", "profile.edit",
    ],
  },
  TESTING_ADMIN: {
    defaultRoute: "/admin",
    sidebar: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/interviews/create", label: "Create Interview", icon: "UserPlus" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/screening", label: "Screening", icon: "FileCheck2" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users", navGroup: "candidates" },
      { href: "/admin/candidates/bulk-import", label: "Bulk Import", icon: "Upload", navGroup: "candidates" },
      { href: "/admin/clients", label: "Clients", icon: "Building2", navGroup: "clients" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/admin/profile", label: "Profile", icon: "User" },
      { href: "/admin/compliance", label: "Compliance", icon: "Eye" },
      { href: "/admin/master-data", label: "Overview", icon: "SlidersHorizontal", navGroup: "masterData" },
      { href: "/admin/master-data/lookups", label: "Lookup Values", icon: "ListTree", navGroup: "masterData" },
      { href: "/admin/master-data/categories", label: "QB Categories", icon: "Layers", navGroup: "masterData" },
      { href: "/admin/master-data/tags", label: "QB Tags", icon: "Tag", navGroup: "masterData" },
      { href: "/admin/master-data/companies", label: "QB Companies", icon: "Building2", navGroup: "masterData" },
      { href: "/admin/questionbank", label: "QuestionBank", icon: "Database" },
    ],
    // Question bank content is shared globally across branches (initial rollout).
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.signoff", "interviews.observe", "interviews.inject", "interviews.flag",
      "candidates.view", "candidates.update", "candidates.bulk_import", "clients.manage", "matching.view",
      "compliance.view", "masterdata.view", "analytics.view", "calendar.view",
      "profile.view", "profile.edit",
    ],
  },
  RECRUITER: {
    defaultRoute: "/admin",
    sidebar: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/interviews/create", label: "Create Interview", icon: "UserPlus" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/screening", label: "Screening", icon: "FileCheck2" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users", navGroup: "candidates" },
      { href: "/admin/clients", label: "Clients", icon: "Building2", navGroup: "clients" },
      { href: "/admin/recruiter-bot", label: "JD Assistant", icon: "Bot", navGroup: "clients" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/admin/profile", label: "Profile", icon: "User" },
    ],
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.observe", "interviews.inject", "candidates.view", "clients.manage",
      "matching.view", "analytics.view", "calendar.view", "profile.view", "profile.edit",
    ],
  },
  TESTING_RECRUITER: {
    defaultRoute: "/admin",
    sidebar: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/interviews/create", label: "Create Interview", icon: "UserPlus" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/screening", label: "Screening", icon: "FileCheck2" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users", navGroup: "candidates" },
      { href: "/admin/clients", label: "Clients", icon: "Building2", navGroup: "clients" },
      { href: "/admin/recruiter-bot", label: "JD Assistant", icon: "Bot", navGroup: "clients" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/admin/profile", label: "Profile", icon: "User" },
    ],
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.observe", "interviews.inject", "candidates.view", "clients.manage",
      "matching.view", "analytics.view", "calendar.view", "profile.view", "profile.edit",
    ],
  },
  CANDIDATE: {
    defaultRoute: "/candidate/dashboard",
    sidebar: [
      { href: "/candidate/dashboard", label: "My Interviews", icon: "ClipboardList" },
      { href: "/candidate/profile", label: "Profile", icon: "User" },
      { href: "/candidate/resume", label: "Resume", icon: "FileText" },
      { href: "/candidate/notifications", label: "Notifications", icon: "Bell" },
    ],
    permissions: [
      "profile.view", "profile.edit", "feedback.view", "notifications.view", "resume.upload",
    ],
  },
};

/** Maps toggleable sidebar routes to the org-level feature that gates them. Routes not listed here
 * (Dashboard, Organizations, Manage Staff, Settings) are role-gated only, never tenant-gated. */
const SIDEBAR_FEATURE_MAP: Record<string, FeatureKey> = {
  "/admin/interviews/create": "INTERVIEWS",
  "/admin/review": "REVIEW",
  "/admin/screening": "SCREENING",
  "/admin/candidates": "CANDIDATES",
  "/admin/candidates/bulk-import": "BULK_IMPORT",
  "/admin/candidates/deployment-bulk-import": "DEPLOYMENT_IMPORT",
  "/admin/clients": "CLIENTS",
  "/admin/recruiter-bot": "RECRUITER_BOT",
  "/admin/calendar": "CALENDAR",
  "/admin/compliance": "COMPLIANCE",
  "/admin/master-data": "MASTER_DATA",
  "/admin/master-data/lookups": "MASTER_DATA",
  "/admin/master-data/categories": "QUESTION_BANK",
  "/admin/master-data/tags": "QUESTION_BANK",
  "/admin/master-data/companies": "QUESTION_BANK",
  "/admin/questionbank": "QUESTION_BANK",
};

export function getSidebarItems(role: UserRole, enabledFeatures?: Record<FeatureKey, boolean>): SidebarItem[] {
  let items = roleConfig[role]?.sidebar ?? [];
  if (enabledFeatures) {
    items = items.filter((item) => {
      const feature = SIDEBAR_FEATURE_MAP[item.href];
      return feature === undefined || enabledFeatures[feature] !== false;
    });
  }
  if (role !== "TESTING_ADMIN" && role !== "TESTING_RECRUITER") {
    return items;
  }
  const relabel: Record<string, string> = {
    Candidates: "Testing Candidates",
    Clients: "Testing Clients",
    "Bulk Import": "Testing Bulk Import",
    "Create Interview": "Create Testing Interview",
  };
  return items.map((item) => ({
    ...item,
    label: relabel[item.label] ?? item.label,
  }));
}

export function getPermissions(role: UserRole): Permission[] {
  return roleConfig[role]?.permissions ?? [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissions(role).includes(permission);
}

export function getDefaultRoute(role: UserRole): string {
  return roleConfig[role]?.defaultRoute ?? "/login";
}

export function getAdminSidebarItems(): SidebarItem[] {
  return roleConfig.ADMIN?.sidebar ?? [];
}
