"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ChevronLeft, Building2, Briefcase } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import type { SidebarItem } from "@/config/roleConfig";
import * as LucideIcons from "lucide-react";

// Icon mapping for dynamic icon rendering
const getIcon = (iconName: string) => {
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || LucideIcons.Circle; // Fallback to Circle if icon not found
};

export function SidebarLayout({
  title,
  subtitle,
  children,
  items,
  username,
  role,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  items: SidebarItem[];
  username?: string;
  role?: string;
}) {
  const [pathname, setPathname] = useState("/");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Safe pathname hook with fallback
  const currentPathname = usePathname();
  
  useEffect(() => {
    if (currentPathname) {
      setPathname(currentPathname);
    }
  }, [currentPathname]);

  const isActive = (href: string) => {
    if (href === "/admin" || href === "/candidate/dashboard") return pathname === href;
    // Exact match for paths to avoid parent highlighting when on child routes
    if (href === "/admin/candidates" && (pathname.startsWith("/admin/candidates/bulk-import") || pathname.startsWith("/admin/candidates/deployment-bulk-import"))) return false;
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        {!collapsed && (
          <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
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
        {items.map((item) => {
          const Icon = getIcon(item.icon);
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
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
          </div>
        )}
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-[#050505]">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-semibold leading-tight sm:text-lg">{title}</h1>
              {subtitle && <p className="hidden text-xs text-zinc-500 sm:block">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            {username && (
              <span className="hidden text-xs text-zinc-500 lg:inline">
                {username} · {role}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
