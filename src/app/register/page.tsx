"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const inputCls = "input-base";
const selectCls = "input-base appearance-none bg-white dark:bg-zinc-950";

type Option = { code: string; label: string };

const FALLBACK_SKILL_SETS: Option[] = [
  { code: "JAVA_SB", label: "Java + Spring Boot" },
  { code: "JFSR", label: "JFSR" },
  { code: "REACT_JS", label: "React JS" },
  { code: "ANGULAR", label: "Angular" },
  { code: "PYTHON", label: "Python" },
  { code: "QA_ENGINEER", label: "QA Engineer" },
  { code: "PLAYWRIGHT_AUTOMATION", label: "Playwright Automation" },
];

const FALLBACK_BRANCHES: Option[] = [
  { code: "DEVELOPMENT", label: "Development" },
  { code: "TESTING", label: "Testing" },
];

/** Public, unauthenticated lookup — candidates fill this form before they have a session. */
function useLookupOptions(category: string, fallback: Option[]): Option[] {
  const [options, setOptions] = useState<Option[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/master-data/${category}`)
      .then((r) => r.json())
      .then((data: { code: string; label: string }[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setOptions(data.map((e) => ({ code: e.code, label: e.label })));
        }
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return options;
}

export default function RegisterPage() {
  const skillSets = useLookupOptions("SKILL_SET", FALLBACK_SKILL_SETS);
  const branches = useLookupOptions("BRANCH", FALLBACK_BRANCHES);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contactNumber: "",
    skillSet: "",
    branch: "",
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
    if (!form.skillSet) errors.skillSet = "Required";
    if (!form.branch) errors.branch = "Required";

    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      contactNumber: form.contactNumber,
      skillSet: form.skillSet,
      branch: form.branch,
    };

    const res = await fetch(`/api/public/register`, {
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
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
                <Field label="Contact Number" error={fieldError.contactNumber}>
                  <input className={inputCls} type="tel" placeholder="9876543210" value={form.contactNumber} onChange={set("contactNumber")} />
                </Field>
              </div>

              {/* Profile */}
              <div className={sectionCls}>
                <p className={sectionTitle}>Profile</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Skill Set" error={fieldError.skillSet}>
                    <select className={selectCls} value={form.skillSet} onChange={set("skillSet")}>
                      <option value="">Select…</option>
                      {skillSets.map((o) => (
                        <option key={o.code} value={o.code}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Branch" error={fieldError.branch}>
                    <select className={selectCls} value={form.branch} onChange={set("branch")}>
                      <option value="">Select…</option>
                      {branches.map((o) => (
                        <option key={o.code} value={o.code}>{o.label}</option>
                      ))}
                    </select>
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
