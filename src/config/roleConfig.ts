import type { UserRole } from "@/server/roles";

export type SidebarItem = {
  href: string;
  label: string;
  icon: string; // Changed to string icon name
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
      { href: "/admin/matching", label: "AI Matching", icon: "Sparkles" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users" },
      { href: "/admin/candidates/bulk-import", label: "Bulk Import", icon: "Upload" },
      { href: "/admin/candidates/deployment-bulk-import", label: "Deployment Import", icon: "Briefcase" },
      { href: "/admin/clients", label: "Clients", icon: "Building2" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/admin/staff", label: "Manage Staff", icon: "Shield" },
      { href: "/admin/settings/tokens", label: "Token Settings", icon: "Settings" },
      { href: "/admin/compliance", label: "Compliance", icon: "Eye" },
    ],
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.signoff", "interviews.observe", "interviews.inject", "interviews.flag",
      "candidates.view", "candidates.update", "candidates.bulk_import", "clients.manage", "matching.view",
      "staff.manage", "tokens.manage", "compliance.view", "analytics.view", "calendar.view",
    ],
  },
  ADMIN: {
    defaultRoute: "/admin",
    sidebar: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/interviews/create", label: "Create Interview", icon: "UserPlus" },
      { href: "/admin/matching", label: "AI Matching", icon: "Sparkles" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users" },
      { href: "/admin/candidates/bulk-import", label: "Bulk Import", icon: "Upload" },
      { href: "/admin/candidates/deployment-bulk-import", label: "Deployment Import", icon: "Briefcase" },
      { href: "/admin/clients", label: "Clients", icon: "Building2" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/admin/settings/tokens", label: "Token Settings", icon: "Settings" },
      { href: "/admin/compliance", label: "Compliance", icon: "Eye" },
    ],
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.signoff", "interviews.observe", "interviews.inject", "interviews.flag",
      "candidates.view", "candidates.update", "candidates.bulk_import", "clients.manage", "matching.view",
      "tokens.manage", "compliance.view", "analytics.view", "calendar.view",
    ],
  },
  RECRUITER: {
    defaultRoute: "/admin",
    sidebar: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/interviews/create", label: "Create Interview", icon: "UserPlus" },
      { href: "/admin/review", label: "Review", icon: "ClipboardList" },
      { href: "/admin/candidates", label: "Candidates", icon: "Users" },
      { href: "/admin/matching", label: "AI Matching", icon: "Sparkles" },
      { href: "/admin/clients", label: "Clients", icon: "Building2" },
      { href: "/admin/recruiter-bot", label: "JD Assistant", icon: "Bot" },
      { href: "/admin/calendar", label: "Calendar", icon: "CalendarDays" },
    ],
    permissions: [
      "dashboard.view", "interviews.create", "interviews.review", "interviews.delete",
      "interviews.observe", "interviews.inject", "candidates.view", "clients.manage",
      "matching.view", "analytics.view", "calendar.view",
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

export function getSidebarItems(role: UserRole): SidebarItem[] {
  return roleConfig[role]?.sidebar ?? [];
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
