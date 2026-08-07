"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const inputCls = "input-base";

const ROLE_ROUTES: Record<string, string> = {
  CANDIDATE: "/candidate/dashboard",
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  TESTING_ADMIN: "/admin",
  RECRUITER: "/admin",
  TESTING_RECRUITER: "/admin",
};

function redirectForRole(role: string, fallback: string) {
  if (fallback && !fallback.startsWith("/login")) return fallback;
  return ROLE_ROUTES[role] ?? (fallback || "/dashboard");
}

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("next") ?? "";
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Login failed");
      return;
    }
    const data = (await res.json()) as { role?: string; name?: string };
    window.location.href = redirectForRole(data.role ?? "ADMIN", next);
  }

  return (
    <form className="grid gap-4" onSubmit={onLogin}>
      <label className="grid gap-1.5 text-sm font-semibold">
        Email
        <input className={inputCls} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Password
        <div className="relative">
          <input className={`${inputCls} pr-10`} type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors duration-150 hover:text-zinc-650 dark:hover:text-zinc-200">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
      <div className="text-right">
        <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 font-medium transition-colors">
          Forgot password?
        </Link>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">{error}</p>}
      <button className="btn-primary mt-2 w-full" type="submit">
        Sign in
      </button>
    </form>
  );
}

function CandidateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: email, password, role: "CANDIDATE" }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      const msg = data?.error ?? "Login failed";
      setError(msg);
      return;
    }
    window.location.href = "/candidate/dashboard";
  }

  const isNotRegistered = error?.toLowerCase().includes("not registered") || error?.toLowerCase().includes("not found");

  return (
    <form className="grid gap-4" onSubmit={onLogin}>
      <label className="grid gap-1.5 text-sm font-semibold">
        Email
        <input className={inputCls} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Password
        <div className="relative">
          <input className={`${inputCls} pr-10`} type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors duration-150 hover:text-zinc-650 dark:hover:text-zinc-200">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
      <div className="text-right">
        <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 font-medium transition-colors">
          Forgot password?
        </Link>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          {isNotRegistered ? (
            <>Email not registered. <Link href="/register" className="underline font-semibold">Register here</Link>.</>
          ) : error}
        </p>
      )}
      <button className="btn-primary mt-2 w-full" type="submit">
        Sign in
      </button>
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-2">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-zinc-700 dark:text-zinc-200 underline transition-colors hover:text-indigo-500 dark:hover:text-indigo-400">Register</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<"staff" | "candidate">("candidate");

  const tabCls = (active: boolean) =>
    `flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${
      active
        ? "text-white shadow-md"
        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
    }`;

  const tabStyle = (active: boolean): React.CSSProperties =>
    active ? { backgroundColor: "#7B3FA0", boxShadow: "0 4px 14px -4px rgba(91,45,142,0.35)" } : {};

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel (hidden on mobile) ── */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden shrink-0"
        style={{ background: "linear-gradient(155deg, #3d1a6e 0%, #5B2D8E 45%, #7B3FA0 100%)" }}
      >
        {/* decorative circles */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-12 right-[-3rem] h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-white/[0.03]" />

        {/* Logo */}
        <div className="relative z-10">
          <span className="text-xl font-extrabold tracking-tight text-white">Bench Readiness</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
              AI-powered interviews,<br />zero manual effort.
            </h2>
            <p className="mt-4 text-white/65 text-sm leading-relaxed max-w-xs">
              Conduct structured voice interviews, auto-score candidates, and get admin sign-off — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {[
              "Voice interviews with real-time transcription",
              "Automated scoring & rubric evaluation",
              "Admin review & one-click sign-off",
              "Candidate screening pipeline",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/80">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-xs text-white/40 font-medium">
          Trusted by hiring teams across India
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8F5FD] dark:bg-[#0e0a1a] px-6 py-10 sm:px-10 relative overflow-hidden">
        {/* subtle bg blobs */}
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-purple-400/8 blur-[100px] dark:bg-purple-500/10" />
        <div className="pointer-events-none absolute right-[-10%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-violet-400/8 blur-[100px] dark:bg-violet-600/8" />

        <div className="relative z-10 w-full max-w-sm space-y-7">
          {/* Mobile-only logo */}
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "#5B2D8E" }}>Bench Readiness</h1>
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-[#6e5f8a]">AI-led voice interviews with admin sign-off.</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#f0ebfa]">Sign in</h1>
            <p className="mt-1.5 text-sm text-zinc-400 dark:text-[#6e5f8a]">Welcome back — choose your account type below.</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/60 dark:border-[#2e224e]/60 bg-white/80 dark:bg-[#17112b]/90 p-7 shadow-xl shadow-purple-500/5 backdrop-blur-xl">
            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100/70 dark:bg-[#1f1839]/80 p-1">
              <button className={tabCls(tab === "candidate")} style={tabStyle(tab === "candidate")} onClick={() => setTab("candidate")}>Candidate</button>
              <button className={tabCls(tab === "staff")} style={tabStyle(tab === "staff")} onClick={() => setTab("staff")}>Staff</button>
            </div>

            {tab === "candidate" ? <CandidateLogin /> : <StaffLogin />}
          </div>
        </div>
      </div>
    </div>
  );
}
