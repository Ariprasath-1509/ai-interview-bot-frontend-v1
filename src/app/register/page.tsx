"use client";

import Link from "next/link";
import { useState } from "react";

const inputCls =
  "rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-700";

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onRegister() {
    setError(null);
    setEmailError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    const res = await fetch(`${GATEWAY}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    }).catch(() => null);

    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (!res?.ok || data?.ok === false) {
      const msg = data?.error ?? "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("email")) setEmailError(msg);
      else setError(msg);
      return;
    }

    setSuccess(true);
    setTimeout(() => { window.location.href = "/login"; }, 2000);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6">
      <main className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">Create account</h1>
          <p className="mt-2 text-sm text-zinc-500">Register as a candidate to take interviews.</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              Registration successful. Redirecting to login…
            </div>
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Full Name
                <input className={inputCls} type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <input className={inputCls} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                {emailError && <span className="text-xs text-red-600 dark:text-red-400">{emailError}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Password <span className="font-normal text-zinc-400">(min 6 chars)</span>
                <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{error}</p>
              )}
              <button
                className="mt-1 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-80"
                type="button"
                onClick={onRegister}
              >
                Register
              </button>
              <p className="text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
