"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const inputCls =
  "rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-700";

const ROLE_ROUTES: Record<string, string> = {
  CANDIDATE: "/candidate/dashboard",
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  RECRUITER: "/admin/review",
};

function redirectForRole(role: string, fallback: string) {
  return ROLE_ROUTES[role] ?? (fallback || "/dashboard");
}

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const next = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("next") ?? "";
  }, []);

  async function onLogin() {
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
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-sm font-medium">
        Email
        <input className={inputCls} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Password
        <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      <button className="mt-1 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-80" type="button" onClick={onLogin}>
        Sign in
      </button>
    </div>
  );
}

function CandidateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onLogin() {
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
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-sm font-medium">
        Email
        <input className={inputCls} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Password
        <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {isNotRegistered ? (
            <>Email not registered. <Link href="/register" className="underline">Register here</Link>.</>
          ) : error}
        </p>
      )}
      <button className="mt-1 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-80" type="button" onClick={onLogin}>
        Sign in
      </button>
      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-100">Register</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<"staff" | "candidate">("candidate");

  const tabCls = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
      active ? "bg-white shadow-sm dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
    }`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-8 dark:bg-[#050505] sm:px-6">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-600/15" />
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/4 rounded-full bg-sky-500/10 blur-[100px] dark:bg-sky-600/15" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full bg-purple-500/10 blur-[100px] dark:bg-purple-600/15" />

      <main className="z-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">Bench Readiness</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">AI-led voice interviews with admin sign-off.</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          {/* Tabs */}
          <div className="mb-5 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
            <button className={tabCls(tab === "candidate")} onClick={() => setTab("candidate")}>Candidate</button>
            <button className={tabCls(tab === "staff")} onClick={() => setTab("staff")}>Staff</button>
          </div>

          {tab === "candidate" ? <CandidateLogin /> : <StaffLogin />}
        </div>
      </main>
    </div>
  );
}
