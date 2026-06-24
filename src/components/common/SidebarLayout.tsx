"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, type ComponentType } from "react";
import { Menu, X, ChevronLeft, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { entityBranchBadgeClass, entityBranchLabel } from "@/lib/staffRoles";
import type { SidebarItem } from "@/config/roleConfig";
import * as LucideIcons from "lucide-react";

const NAV_GROUP_LABEL: Record<string, string> = {
  candidates: "Candidates",
  clients: "Clients",
  masterData: "Master Data",
};

type NavChunk =
  | { type: "flat"; items: SidebarItem[] }
  | { type: "group"; id: string; label: string; items: SidebarItem[] };

function chunkSidebarNav(items: SidebarItem[]): NavChunk[] {
  const chunks: NavChunk[] = [];
  let flat: SidebarItem[] = [];
  let groupId: string | null = null;
  let groupItems: SidebarItem[] = [];

  const flushFlat = () => {
    if (flat.length) {
      chunks.push({ type: "flat", items: [...flat] });
      flat = [];
    }
  };
  const flushGroup = () => {
    if (groupId && groupItems.length) {
      chunks.push({
        type: "group",
        id: groupId,
        label: NAV_GROUP_LABEL[groupId] ?? groupId,
        items: [...groupItems],
      });
      groupItems = [];
      groupId = null;
    }
  };

  for (const item of items) {
    const g = item.navGroup;
    if (!g) {
      flushGroup();
      flat.push(item);
    } else {
      flushFlat();
      if (groupId !== g) {
        flushGroup();
        groupId = g;
      }
      groupItems.push(item);
    }
  }
  flushFlat();
  flushGroup();
  return chunks;
}

// Icon mapping for dynamic icon rendering
const getIcon = (iconName: string) => {
  const IconComponent = (
    LucideIcons as unknown as Record<string, ComponentType<{ size?: number; className?: string }>>
  )[iconName];
  return IconComponent || LucideIcons.Circle;
};

export function SidebarLayout({
  title,
  subtitle,
  children,
  items,
  username,
  role,
  branch,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  items: SidebarItem[];
  username?: string;
  role?: string;
  branch?: string;
}) {
  const [pathname, setPathname] = useState("/");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Defaults only until after mount — avoids SSR/client localStorage mismatch. */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    candidates: true,
    clients: true,
    masterData: true,
  });

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        setOpenGroups((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            const v = localStorage.getItem(`navgrp-${id}`);
            if (v !== null) next[id] = v === "1";
          }
          return next;
        });
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const navChunks = useMemo(() => chunkSidebarNav(items), [items]);

  // Safe pathname hook with fallback
  const currentPathname = usePathname();
  
  useEffect(() => {
    if (!currentPathname) return;
    const t = window.setTimeout(() => {
      setPathname(currentPathname);
    }, 0);
    return () => window.clearTimeout(t);
  }, [currentPathname]);

  const isActive = (href: string) => {
    // Exact match always wins
    if (pathname === href) return true;

    // /admin/interviews/:id/review should highlight "Review" (/admin/review)
    if (href === "/admin/review" && /^\/admin\/interviews\/[^/]+\/review/.test(pathname)) {
      return true;
    }

    // For prefix matches, only highlight if no other nav item is a longer
    // prefix of the current pathname (i.e. a more-specific sibling is active)
    if (pathname.startsWith(href + "/") || pathname.startsWith(href + "?")) {
      // Don't let /admin match when on an interview review page
      if (href === "/admin" && /^\/admin\/interviews\/[^/]+\/review/.test(pathname)) {
        return false;
      }
      const hasMoreSpecificMatch = items.some(
        (item) =>
          item.href !== href &&
          item.href.startsWith(href) &&
          (pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            pathname.startsWith(item.href + "?"))
      );
      return !hasMoreSpecificMatch;
    }

    return false;
  };

  const renderNavLink = (item: SidebarItem) => {
    const Icon = getIcon(item.icon);
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-200 ${
          active
            ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30 scale-[1.015]"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-violet-50/50 dark:hover:bg-violet-950/25 hover:translate-x-0.5"
        } ${collapsed ? "justify-center px-2 hover:translate-x-0" : ""}`}
      >
        <Icon size={18} className={`shrink-0 transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const toggleNavGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`navgrp-${id}`, next[id] ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-violet-200/50 bg-gradient-to-r from-indigo-50/40 via-violet-50/30 to-fuchsia-50/20 px-4 dark:border-violet-900/20 dark:from-indigo-950/30 dark:via-violet-950/20 dark:to-fuchsia-950/10">
        {!collapsed && (
          <Link href="/" className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent transition-opacity hover:opacity-90">
            Bench Readiness
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:flex"
        >
          <ChevronLeft size={16} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navChunks.map((chunk) => {
          if (chunk.type === "flat") {
            return chunk.items.map((item) => renderNavLink(item));
          }
          const open = openGroups[chunk.id] ?? true;
          return (
            <div key={chunk.id} className="space-y-0.5">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleNavGroup(chunk.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <span>{chunk.label}</span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
              )}
              {(collapsed || open) && (
                <div className={collapsed ? "space-y-0.5" : "space-y-0.5 pl-1 border-l border-zinc-200 ml-2 dark:border-zinc-800"}>
                  {chunk.items.map((item) => renderNavLink(item))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        {!collapsed && username && (
          <div className="mb-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{username}</span>
            <br />
            <span>{role}</span>
            {branch && (
              <span className={`ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${entityBranchBadgeClass(branch)}`}>
                {entityBranchLabel(branch)}
              </span>
            )}
          </div>
        )}
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-white/10 dark:border-zinc-900/20 bg-white/40 dark:bg-zinc-950/40 shadow-lg shadow-violet-500/5 backdrop-blur-xl transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex h-full w-64 flex-col border-r border-white/10 dark:border-zinc-900/20 bg-white/75 dark:bg-zinc-950/75 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/10 dark:border-zinc-900/20 bg-white/40 dark:bg-[#040409]/40 px-4 backdrop-blur-xl sm:px-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-violet-700 hover:bg-violet-100/50 hover:text-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30 dark:hover:text-violet-200 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold leading-tight bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent sm:text-lg">{title}</h1>
              {subtitle && <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            {username && (
              <span className="hidden items-center gap-2 text-xs font-semibold text-zinc-500 lg:inline-flex">
                {username} · <span className="text-zinc-400">{role}</span>
                {branch && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${entityBranchBadgeClass(branch)}`}>
                    {entityBranchLabel(branch)}
                  </span>
                )}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="app-main-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-4 sm:p-6 w-full min-w-0 max-w-full">
          <div className="page-content min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
