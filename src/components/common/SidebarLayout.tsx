"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useRef, type ComponentType } from "react";
import { Menu, X, ChevronLeft, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { entityBranchBadgeClass, entityBranchLabel } from "@/lib/staffRoles";
import type { SidebarItem } from "@/config/roleConfig";
import * as LucideIcons from "lucide-react";
import { TourRunner } from "@/components/tour/TourRunner";
import { TourButton } from "@/components/tour/TourButton";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

let globalSidebarScrollPos = 0;

const NAV_GROUP_LABEL: Record<string, string> = {
  candidates: "Candidates",
  clients: "Clients",
  masterData: "Master Data",
  admin: "Admin",
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

const iconCache = new Map<string, ComponentType<{ size?: number; className?: string }>>();

const getIcon = (iconName: string) => {
  if (iconCache.has(iconName)) return iconCache.get(iconName)!;
  const IconComponent = (
    LucideIcons as unknown as Record<string, ComponentType<{ size?: number; className?: string }>>
  )[iconName] || LucideIcons.Circle;
  iconCache.set(iconName, IconComponent);
  return IconComponent;
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
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
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
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const restoreScroll = () => {
      if (navRef.current) {
        try {
          const stored = sessionStorage.getItem("sidebarScrollPos");
          const pos = stored !== null ? parseInt(stored, 10) : globalSidebarScrollPos;
          if (!isNaN(pos) && pos > 0) {
            navRef.current.scrollTop = pos;
          }
        } catch {
          if (globalSidebarScrollPos > 0) {
            navRef.current.scrollTop = globalSidebarScrollPos;
          }
        }
      }
    };

    restoreScroll();
    const timer = setTimeout(restoreScroll, 50);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleNavScroll = (e: React.UIEvent<HTMLElement>) => {
    const pos = e.currentTarget.scrollTop;
    globalSidebarScrollPos = pos;
    try {
      sessionStorage.setItem("sidebarScrollPos", String(pos));
    } catch {}
  };

  const navChunks = useMemo(() => chunkSidebarNav(items), [items]);

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/admin/review" && /^\/admin\/interviews\/[^/]+\/review/.test(pathname)) return true;
    if (href === "/admin") {
      if (/^\/admin\/interviews\/[^/]+\/review/.test(pathname)) return false;
      return pathname === "/admin";
    }

    if (pathname.startsWith(href + "/") || pathname.startsWith(href + "?")) {
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

  const toggleNavGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`navgrp-${id}`, next[id] ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const renderNavLink = (item: SidebarItem) => {
    const Icon = getIcon(item.icon);
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        scroll={false}
        title={collapsed ? item.label : undefined}
        onClick={() => {
          if (mobileOpen) setMobileOpen(false);
          if (navRef.current) {
            const pos = navRef.current.scrollTop;
            globalSidebarScrollPos = pos;
            try {
              sessionStorage.setItem("sidebarScrollPos", String(pos));
            } catch {}
          }
        }}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer active:scale-[0.98] focus:outline-none border",
          active
            ? "bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_10px_rgba(42,0,53,0.4)] border-purple-300/30"
            : "border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_10px_rgba(42,0,53,0.4)] hover:border-purple-300/30",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110", active ? "text-white" : "group-hover:text-white")} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };


  const userInitial = username ? username.charAt(0).toUpperCase() : "U";

  const sidebarContent = (
    <div className="flex h-full flex-col backdrop-blur-md">
      {/* Header / Logo */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
        {!collapsed && (
          <Link href="/" scroll={false} className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-[var(--color-primary)] cursor-pointer hover:opacity-90 transition-opacity">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm text-xs font-bold">
              BR
            </span>
            <span>Bench Readiness</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex cursor-pointer p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-all duration-150"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft size={16} className={cn("transition-transform duration-200 ease-in-out", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav items */}
      <nav ref={navRef} onScroll={handleNavScroll} className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navChunks.map((chunk) => {
          if (chunk.type === "flat") {
            return chunk.items.map(renderNavLink);
          }

          const open = openGroups[chunk.id] ?? true;

          return (
            <div key={chunk.id} className="space-y-0.5">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleNavGroup(chunk.id)}
                  className="flex w-full items-center justify-between px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <span>{chunk.label}</span>
                  <ChevronDown
                    size={13}
                    className={cn("transition-transform duration-150 shrink-0 opacity-70", open ? "rotate-0" : "-rotate-90")}
                  />
                </button>
              ) : null}

              {(collapsed || open) && (
                <div className={cn("space-y-0.5 transition-all duration-150", !collapsed && "pl-0.5")}>
                  {chunk.items.map(renderNavLink)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User profile card */}
      <div className="border-t border-[var(--border)] p-3">
        {!collapsed && username && (
          <div className="mb-2.5 flex items-center gap-2.5 rounded-lg p-2 bg-[var(--surface-subtle)] border border-[var(--border)]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs shadow-sm">
              {userInitial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{username}</p>
              <div className="flex items-center gap-1">
                <span className="truncate text-[10px] text-[var(--text-secondary)]">{role}</span>
                {branch && (
                  <span className={cn("rounded-full px-1.5 py-0.2 text-[9px] font-medium shrink-0", entityBranchBadgeClass(branch))}>
                    {entityBranchLabel(branch)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <TourRunner role={role ?? ""} />

      {/* Desktop Sidebar */}
      <aside
        data-tour="sidebar"
        className={cn(
          "hidden lg:flex flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-sm transition-all duration-150 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity cursor-pointer" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-[var(--surface)] shadow-2xl border-r border-[var(--border)]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 shadow-sm z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">{title}</h1>
              {subtitle && <p className="hidden text-xs text-[var(--text-secondary)] sm:block">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span data-tour="notification-bell">
              <NotificationCenter />
            </span>
            <TourButton role={role ?? ""} />
          </div>
        </header>

        <main className="app-main-scroll flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}