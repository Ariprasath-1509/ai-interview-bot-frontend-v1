"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#5C0062] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5C0062] transition-colors";

const btnCls =
  "w-full rounded-full bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-150 hover:opacity-90 cursor-pointer active:scale-[0.98]";

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
  const [loading, setLoading] = useState(false);
  const next = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("next") ?? "";
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Login failed");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { role?: string; name?: string };
      window.location.href = redirectForRole(data.role ?? "ADMIN", next);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onLogin}>
      <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
        <span className="flex items-center gap-1"><span className="text-red-500">*</span> Email</span>
        <input className={inputCls} type="email" placeholder="Enter your Email Id" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
        <span className="flex items-center gap-1"><span className="text-red-500">*</span> Password</span>
        <div className="relative">
          <input className={`${inputCls} pr-10`} type={showPwd ? "text" : "password"} placeholder="Enter your Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors duration-150 hover:text-zinc-650" disabled={loading}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
      <div className="text-right">
        <Link href="/forgot-password" className="text-xs font-semibold text-[#5C0062] hover:underline transition-colors">
          Forgot Password?
        </Link>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <button className={btnCls} type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

function CandidateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: email, password, role: "CANDIDATE" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        const msg = data?.error ?? "Login failed";
        setError(msg);
        setLoading(false);
        return;
      }
      window.location.href = "/candidate/dashboard";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const isNotRegistered = error?.toLowerCase().includes("not registered") || error?.toLowerCase().includes("not found");

  return (
    <form className="grid gap-4" onSubmit={onLogin}>
      <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
        <span className="flex items-center gap-1"><span className="text-red-500">*</span> Email</span>
        <input className={inputCls} type="email" placeholder="Enter your Email Id" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
        <span className="flex items-center gap-1"><span className="text-red-500">*</span> Password</span>
        <div className="relative">
          <input className={`${inputCls} pr-10`} type={showPwd ? "text" : "password"} placeholder="Enter your Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors duration-150 hover:text-zinc-650" disabled={loading}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
      <div className="text-right">
        <Link href="/forgot-password" className="text-xs font-semibold text-[#5C0062] hover:underline transition-colors">
          Forgot Password?
        </Link>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {isNotRegistered ? (
            <>Email not registered. <Link href="/register" className="underline font-semibold">Register here</Link>.</>
          ) : error}
        </p>
      )}
      <button className={btnCls} type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-xs text-zinc-500 mt-2">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[#5C0062] underline transition-colors hover:text-[#3B0045]">Register</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<"staff" | "candidate">("candidate");

  const tabCls = (active: boolean) =>
    `flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
      active
        ? "bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] text-white shadow-sm"
        : "text-zinc-500 hover:text-zinc-900"
    }`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#15001c] px-6 py-12 lg:px-16">

      <main className="z-10 flex w-full max-w-6xl flex-col items-center justify-between gap-12 lg:flex-row lg:items-center">
        {/* Left Side: White Heading & Hero Text */}
        <div className="flex flex-col justify-center space-y-5 max-w-lg text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] text-white font-black text-sm border border-white/20 shadow-md">
              BR
            </div>
            <span className="text-2xl font-black tracking-tight text-white">BENCH READINESS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight !text-white uppercase leading-tight" style={{ color: "#ffffff" }}>
            SIMPLIFY INTERVIEWS. AMPLIFY QUALITY.
          </h1>

          <p className="text-sm text-purple-100/90 leading-relaxed font-normal">
            Bench Readiness is your all-in-one interview evaluation solution — combining AI-driven intelligence with Super Automation to streamline end-to-end evaluations and supercharge your hiring process.
          </p>

          <p className="text-base font-extrabold text-white">
            Get. Set. Bench Readiness!
          </p>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-sm shrink-0 rounded-2xl border border-white/20 bg-white p-8 shadow-2xl shadow-purple-950/40 text-zinc-900">
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-zinc-900">Sign in</h2>
            <div className="w-8 h-1 bg-[#5C0062] rounded-full mx-auto mt-1.5" />
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-full bg-zinc-100 p-1">
            <button className={tabCls(tab === "candidate")} onClick={() => setTab("candidate")}>Candidate</button>
            <button className={tabCls(tab === "staff")} onClick={() => setTab("staff")}>Staff</button>
          </div>

          {tab === "candidate" ? <CandidateLogin /> : <StaffLogin />}
        </div>
      </main>
    </div>
  );
}

