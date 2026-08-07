"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { entityBranchBadgeClass, entityBranchLabel } from "@/lib/staffRoles";
import type { SidebarItem } from "@/config/roleConfig";
import * as LucideIcons from "lucide-react";
import { TourRunner } from "@/components/tour/TourRunner";
import { TourButton } from "@/components/tour/TourButton";

const NAV_GROUP_LABEL: Record<string, string> = {
  candidates: "Candidates",
  clients:    "Clients",
  masterData: "Data",
  admin:      "Admin",
};

/* Items shown directly in the topbar as standalone links. */
const TOP_HREFS = new Set([
  "/admin",
  "/admin/interviews/create",
  "/admin/review",
  "/admin/screening",
  "/admin/candidates",
  "/admin/clients",
  "/admin/recruiter-bot",
  "/admin/calendar",
  "/candidate/dashboard",
  "/candidate/profile",
  "/candidate/resume",
  "/candidate/notifications",
  "/talent",
  "/talent/questions",
  "/talent/rubrics",
  "/engineer",
  "/dashboard",
]);

/* Items displayed near the user avatar rather than inline nav. */
const USER_AREA_HREFS = new Set([
  "/admin/profile",
]);

const getIcon = (iconName: string) => {
  const Ic = (LucideIcons as unknown as Record<string, ComponentType<{ size?: number; className?: string }>>)[iconName];
  return Ic ?? LucideIcons.Circle;
};

type NavGroup = { id: string; label: string; items: SidebarItem[] };

function buildNav(items: SidebarItem[]) {
  const primary: SidebarItem[] = [];
  const groupMap = new Map<string, NavGroup>();
  const groupOrder: string[] = [];
  const overflow: SidebarItem[] = [];

  for (const item of items) {
    if (USER_AREA_HREFS.has(item.href)) continue;

    if (item.navGroup) {
      if (!groupMap.has(item.navGroup)) {
        groupOrder.push(item.navGroup);
        groupMap.set(item.navGroup, {
          id: item.navGroup,
          label: NAV_GROUP_LABEL[item.navGroup] ?? item.navGroup,
          items: [],
        });
      }
      groupMap.get(item.navGroup)!.items.push(item);
    } else if (TOP_HREFS.has(item.href)) {
      primary.push(item);
    } else {
      overflow.push(item);
    }
  }

  const groups = groupOrder.map((id) => groupMap.get(id)!);
  return { primary, groups, overflow };
}

const TOPBAR_BG = "#5B2D8E";

type PanelPos = { top: number; left?: number; right?: number };

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
  const currentPathname = usePathname();
  const [pathname, setPathname] = useState("/");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentPathname) setPathname(currentPathname);
  }, [currentPathname]);

  const closeDropdown = () => {
    setOpenDropdown(null);
    setPanelPos(null);
  };

  const toggleDropdown = (id: string, align: "left" | "right" = "left") => {
    if (openDropdown === id) {
      closeDropdown();
      return;
    }
    const trigger = triggerRefs.current[id];
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setPanelPos(
        align === "right"
          ? { top: rect.bottom + 6, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 6, left: rect.left }
      );
    }
    setOpenDropdown(id);
  };

  useEffect(() => {
    if (!openDropdown) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = headerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) closeDropdown();
    };
    const handleScrollOrResize = () => closeDropdown();

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [openDropdown]);

  useEffect(() => {
    setMobileOpen(false);
    closeDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const { primary, groups, overflow } = useMemo(() => buildNav(items), [items]);

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/admin/review" && /^\/admin\/interviews\/[^/]+\/review/.test(pathname)) return true;
    if (pathname.startsWith(href + "/") || pathname.startsWith(href + "?")) {
      if (href === "/admin" && /^\/admin\/interviews\/[^/]+\/review/.test(pathname)) return false;
      const hasSpecific = items.some(
        (item) =>
          item.href !== href &&
          item.href.startsWith(href) &&
          (pathname === item.href || pathname.startsWith(item.href + "/") || pathname.startsWith(item.href + "?"))
      );
      return !hasSpecific;
    }
    return false;
  };

  const isGroupActive = (groupItems: SidebarItem[]) => groupItems.some((item) => isActive(item.href));

  const linkCls = (active: boolean) =>
    `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
      active
        ? "bg-white/20 text-white font-semibold"
        : "text-white/75 hover:text-white hover:bg-white/12"
    }`;

  const dropdownTriggerCls = (active: boolean) =>
    `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
      active
        ? "bg-white/20 text-white font-semibold"
        : "text-white/75 hover:text-white hover:bg-white/12"
    }`;

  const renderLink = (item: SidebarItem) => {
    const Icon = getIcon(item.icon);
    return (
      <Link key={item.href} href={item.href} className={linkCls(isActive(item.href))}>
        <Icon size={15} className="shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const renderDropdownTrigger = (id: string, label: string, dropItems: SidebarItem[], triggerIcon?: string) => {
    const active = isGroupActive(dropItems);
    const open = openDropdown === id;
    const TriggerIcon = triggerIcon ? getIcon(triggerIcon) : (getIcon(dropItems[0]?.icon ?? "MoreHorizontal"));
    return (
      <button
        key={id}
        type="button"
        ref={(el) => { triggerRefs.current[id] = el; }}
        onClick={() => toggleDropdown(id)}
        className={dropdownTriggerCls(active)}
      >
        <TriggerIcon size={15} className="shrink-0" />
        <span>{label}</span>
        <ChevronDown size={12} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
    );
  };

  const renderDropdownPanel = (id: string, dropItems: SidebarItem[]) => {
    if (openDropdown !== id || !panelPos || !mounted) return null;
    return createPortal(
      <div
        ref={panelRef}
        className="fixed z-[100] min-w-[192px] rounded-xl border border-zinc-200 dark:border-[#2e224e] bg-white dark:bg-[#17112b] shadow-lg py-1.5 animate-dropdown"
        style={{ top: panelPos.top, left: panelPos.left, right: panelPos.right }}
      >
        {dropItems.map((item) => {
          const ItemIcon = getIcon(item.icon);
          const a = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDropdown}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                a
                  ? "bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 font-semibold"
                  : "text-zinc-700 dark:text-[#c4b8d8] hover:bg-purple-50/70 dark:hover:bg-purple-950/20 hover:text-purple-800 dark:hover:text-purple-300"
              }`}
            >
              <ItemIcon size={15} className={`shrink-0 ${a ? "text-purple-600 dark:text-purple-400" : "text-zinc-400 dark:text-[#6e5f8a]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>,
      document.body
    );
  };

  /* User avatar dropdown */
  const renderUserMenu = () => {
    if (!username) return null;
    const open = openDropdown === "__user__";
    const initial = username.charAt(0).toUpperCase();
    return (
      <>
        <button
          type="button"
          ref={(el) => { triggerRefs.current.__user__ = el; }}
          onClick={() => toggleDropdown("__user__", "right")}
          className="flex items-center gap-2 rounded-full bg-white/15 pl-1.5 pr-3 py-1 text-white hover:bg-white/25 transition-colors"
        >
          <div className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center text-[12px] font-bold text-white">
            {initial}
          </div>
          <span className="hidden sm:block text-xs font-medium">{username}</span>
          <ChevronDown size={12} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && panelPos && mounted && createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] min-w-[210px] rounded-xl border border-zinc-200 dark:border-[#2e224e] bg-white dark:bg-[#17112b] shadow-lg py-1.5 animate-dropdown"
            style={{ top: panelPos.top, left: panelPos.left, right: panelPos.right }}
          >
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-[#2e224e]">
              <div className="text-sm font-semibold text-zinc-900 dark:text-[#ede8f5]">{username}</div>
              <div className="text-xs text-zinc-500 dark:text-[#9585b3] mt-0.5">{role}</div>
              {branch && (
                <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${entityBranchBadgeClass(branch)}`}>
                  {entityBranchLabel(branch)}
                </span>
              )}
            </div>
            {/* Profile link if exists */}
            {items.find((i) => USER_AREA_HREFS.has(i.href)) && (
              <Link
                href="/admin/profile"
                onClick={closeDropdown}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 dark:text-[#c4b8d8] hover:bg-purple-50/70 dark:hover:bg-purple-950/20 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                <LucideIcons.User size={15} className="shrink-0 text-zinc-400 dark:text-[#6e5f8a]" />
                Profile
              </Link>
            )}
            <div className="px-3 py-1.5">
              <LogoutButton />
            </div>
          </div>,
          document.body
        )}
      </>
    );
  };

  return (
    <div className="app-shell flex flex-col">
      <TourRunner role={role ?? ""} />

      {/* ── Top navigation bar ──────────────────────────────────────── */}
      <header
        ref={headerRef}
        className="relative z-30 flex h-14 shrink-0 items-center justify-between px-4 sm:px-6 shadow-md"
        style={{ background: TOPBAR_BG }}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0 mr-4 text-base font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity">
          Bench Readiness
        </Link>

        {/* Desktop nav items */}
        <nav className="hidden lg:flex flex-1 items-center gap-0.5 overflow-x-auto min-w-0">
          {primary.map((item) => renderLink(item))}
          {groups.map((g) => renderDropdownTrigger(g.id, g.label, g.items))}
          {overflow.length > 0 && renderDropdownTrigger("__more__", "More", overflow, "MoreHorizontal")}
        </nav>

        {/* Right side: notifications, tour, user */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-white" data-tour="notification-bell">
            <NotificationCenter />
          </span>
          <TourButton role={role ?? ""} />
          <div className="hidden lg:block">
            {renderUserMenu()}
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white lg:hidden transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Portal-rendered dropdown panels (escape header/nav overflow clipping) */}
      {groups.map((g) => renderDropdownPanel(g.id, g.items))}
      {overflow.length > 0 && renderDropdownPanel("__more__", overflow)}

      {/* ── Mobile nav slide-down ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ top: "56px" }}>
          <div className="absolute inset-0 bg-black/25" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-white dark:bg-[#17112b] shadow-xl max-h-[75vh] overflow-y-auto">
            <nav className="flex flex-col p-2 gap-0.5">
              {items.map((item) => {
                const Icon = getIcon(item.icon);
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 font-semibold"
                        : "text-zinc-700 dark:text-[#c4b8d8] hover:bg-purple-50/60 dark:hover:bg-purple-950/20 hover:text-purple-700 dark:hover:text-purple-300"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-zinc-100 dark:border-[#2e224e] px-4 py-3">
              {username && (
                <div className="mb-2 text-xs text-zinc-500 dark:text-[#9585b3]">
                  <span className="font-semibold text-zinc-700 dark:text-[#c4b8d8]">{username}</span>{" "}
                  <span>· {role}</span>
                  {branch && (
                    <span className={`ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${entityBranchBadgeClass(branch)}`}>
                      {entityBranchLabel(branch)}
                    </span>
                  )}
                </div>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ─────────────────────────────────────────────── */}
      <main className="app-main-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-4 sm:p-6 w-full min-w-0 max-w-full">
        <div className="page-content min-w-0">{children}</div>
      </main>
    </div>
  );
}
