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
        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20"
        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
    }`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-8 dark:bg-[#040409] sm:px-6">
      {/* Dynamic backdrop blobs */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/15 animate-[aura-flow_20s_infinite_alternate_ease-in-out]" />
      <div className="pointer-events-none absolute right-[-10%] bottom-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-fuchsia-500/10 blur-[120px] dark:bg-fuchsia-500/15 animate-[aura-flow_25s_infinite_alternate-reverse_ease-in-out]" />

      <main className="z-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            Bench Readiness
          </h1>
          <p className="mt-2.5 text-sm text-zinc-400 dark:text-zinc-500 font-medium">AI-led voice interviews with admin sign-off.</p>
        </div>

        <div className="rounded-2xl border border-white/20 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 p-8 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 p-1 backdrop-blur-md">
            <button className={tabCls(tab === "candidate")} onClick={() => setTab("candidate")}>Candidate</button>
            <button className={tabCls(tab === "staff")} onClick={() => setTab("staff")}>Staff</button>
          </div>

          {tab === "candidate" ? <CandidateLogin /> : <StaffLogin />}
        </div>
      </main>
    </div>
  );
}
