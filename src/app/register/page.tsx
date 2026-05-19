"use client";

import Link from "next/link";
import { useState } from "react";

const inputCls = "input-base";
const selectCls = "input-base appearance-none bg-white dark:bg-zinc-950";

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contactNumber: "",
    officialEmail: "",
    personalEmail: "",
    batch: "",
    source: "" as "" | "B2B" | "BENCH" | "MARKET",
    skillSet: "" as "" | "JAVA_SB" | "JFSR" | "REACT_JS" | "ANGULAR" | "PYTHON" | "QA_ENGINEER" | "PLAYWRIGHT_AUTOMATION",
    yoeActual: "",
    yoePortrayed: "",
    yop: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      setFieldError((p) => ({ ...p, [field]: "" }));
    };
  }

  async function onRegister() {
    setError(null);
    setFieldError({});

    // Validation
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    if (form.password.length < 6) errors.password = "Min 6 characters";
    if (!form.contactNumber.trim()) errors.contactNumber = "Required";
    if (!form.batch.trim()) errors.batch = "Required";
    if (!form.source) errors.source = "Required";
    if (!form.skillSet) errors.skillSet = "Required";
    if (!form.yoeActual) errors.yoeActual = "Required";
    if (!form.yoePortrayed) errors.yoePortrayed = "Required";
    if (!form.yop) errors.yop = "Required";

    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      contactNumber: form.contactNumber,
      officialEmail: form.officialEmail || null,
      personalEmail: form.personalEmail || null,
      batch: form.batch,
      source: form.source,
      skillSet: form.skillSet,
      yoeActual: parseFloat(form.yoeActual),
      yoePortrayed: parseFloat(form.yoePortrayed),
      yop: parseInt(form.yop),
    };

    const res = await fetch(`${GATEWAY}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (!res?.ok || data?.ok === false) {
      const msg = data?.error ?? "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("email")) setFieldError({ email: msg });
      else setError(msg);
      return;
    }

    setSuccess(true);
    setTimeout(() => { window.location.href = "/login"; }, 2000);
  }

  const sectionCls = "space-y-3";
  const sectionTitle = "section-label";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-8 dark:bg-[#050505] sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-600/15" />

      <main className="z-10 w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
            Candidate Registration
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Fill in your profile to get started with interviews.</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              Registration successful. Redirecting to login…
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account */}
              <div className={sectionCls}>
                <p className={sectionTitle}>Account</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full Name" error={fieldError.name}>
                    <input className={inputCls} type="text" placeholder="John Doe" value={form.name} onChange={set("name")} />
                  </Field>
                  <Field label="Login Email" error={fieldError.email}>
                    <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
                  </Field>
                </div>
                <Field label="Password" hint="min 6 chars" error={fieldError.password}>
                  <input className={inputCls} type="password" value={form.password} onChange={set("password")} />
                </Field>
              </div>

              {/* Contact */}
              <div className={sectionCls}>
                <p className={sectionTitle}>Contact</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Contact Number" error={fieldError.contactNumber}>
                    <input className={inputCls} type="tel" placeholder="9876543210" value={form.contactNumber} onChange={set("contactNumber")} />
                  </Field>
                  <Field label="Official Email" hint="optional">
                    <input className={inputCls} type="email" placeholder="you@company.com" value={form.officialEmail} onChange={set("officialEmail")} />
                  </Field>
                </div>
                <Field label="Personal Email" hint="optional">
                  <input className={inputCls} type="email" placeholder="you@gmail.com" value={form.personalEmail} onChange={set("personalEmail")} />
                </Field>
              </div>

              {/* Profile */}
              <div className={sectionCls}>
                <p className={sectionTitle}>Profile</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Batch" error={fieldError.batch}>
                    <input className={inputCls} type="text" placeholder="Batch-2026-Q2" value={form.batch} onChange={set("batch")} />
                  </Field>
                  <Field label="Source" error={fieldError.source}>
                    <select className={selectCls} value={form.source} onChange={set("source")}>
                      <option value="">Select…</option>
                      <option value="B2B">B2B</option>
                      <option value="BENCH">Bench</option>
                      <option value="MARKET">Market</option>
                    </select>
                  </Field>
                </div>
                <Field label="Skill Set" error={fieldError.skillSet}>
                  <select className={selectCls} value={form.skillSet} onChange={set("skillSet")}>
                    <option value="">Select…</option>
                    <option value="JAVA_SB">Java + Spring Boot</option>
                    <option value="JFSR">JFSR</option>
                    <option value="REACT_JS">React JS</option>
                    <option value="ANGULAR">Angular</option>
                    <option value="PYTHON">Python</option>
                    <option value="QA_ENGINEER">QA Engineer</option>
                    <option value="PLAYWRIGHT_AUTOMATION">Playwright Automation</option>
                  </select>
                </Field>
              </div>

              {/* Experience */}
              <div className={sectionCls}>
                <p className={sectionTitle}>Experience</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="YOE (Actual)" error={fieldError.yoeActual}>
                    <input className={inputCls} type="number" step="0.5" min="0" max="30" placeholder="3.5" value={form.yoeActual} onChange={set("yoeActual")} />
                  </Field>
                  <Field label="YOE (Portrayed)" error={fieldError.yoePortrayed}>
                    <input className={inputCls} type="number" step="0.5" min="0" max="30" placeholder="5.0" value={form.yoePortrayed} onChange={set("yoePortrayed")} />
                  </Field>
                  <Field label="Year of Passing" error={fieldError.yop}>
                    <input className={inputCls} type="number" min="2000" max="2030" placeholder="2022" value={form.yop} onChange={set("yop")} />
                  </Field>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              )}

              <button
                className="mt-1 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-80"
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

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>
        {label}
        {hint && <span className="ml-1 font-normal text-zinc-400">({hint})</span>}
      </span>
      {children}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
