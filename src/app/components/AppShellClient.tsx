"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

type NavLink = { href: string; label: string };

function MobileMenu({ links, username, role }: { links: NavLink[]; username?: string; role?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="flex items-center justify-center rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 md:hidden"
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-white/20 bg-white/90 backdrop-blur-xl px-4 py-3 shadow-md dark:border-zinc-800/50 dark:bg-[#050505]/90 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          {username && (
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="px-3 text-xs text-zinc-500">
                {username} <span className="text-zinc-400">({role})</span>
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function AppShellClient({
  title,
  subtitle,
  children,
  links,
  username,
  role,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  links: NavLink[];
  username?: string;
  role?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-[#050505]">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 -z-10 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-500/15" />
      <div className="pointer-events-none absolute -right-40 top-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[150px] dark:bg-emerald-500/10" />

      <header className="sticky top-0 z-10 border-b border-white/20 bg-white/70 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-[#050505]/70 shadow-sm">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold tracking-tight">
              Bench Readiness
            </Link>
            <nav className="hidden gap-1 md:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {username ? (
              <div className="hidden text-sm text-zinc-600 dark:text-zinc-300 md:block">
                {username} <span className="text-zinc-400">({role})</span>
              </div>
            ) : null}
            {username ? <LogoutButton /> : null}
            <MobileMenu links={links} username={username} role={role} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
