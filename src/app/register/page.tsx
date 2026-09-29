"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#5C0062] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5C0062] transition-colors";

const selectCls =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#5C0062] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5C0062] transition-colors";

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
  const sectionTitle = "text-xs font-bold uppercase tracking-wider text-[#5C0062] border-b border-zinc-100 pb-1 mb-2";

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
            JOIN THE PLATFORM. AMPLIFY QUALITY.
          </h1>

          <p className="text-sm text-purple-100/90 leading-relaxed font-normal">
            Create your candidate profile to start taking AI-led technical and screening assessments with real-time feedback and evaluation scores.
          </p>

          <p className="text-base font-extrabold text-white">
            Get. Set. Bench Readiness!
          </p>
        </div>

        {/* Right Side: Registration Card */}
        <div className="w-full max-w-md shrink-0 rounded-2xl border border-white/20 bg-white p-8 shadow-2xl shadow-purple-950/40 text-zinc-900">
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-zinc-900">Candidate Registration</h2>
            <div className="w-8 h-1 bg-[#5C0062] rounded-full mx-auto mt-1.5" />
          </div>

          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-semibold text-center">
              Registration successful. Redirecting to login…
            </div>
          ) : (
            <div className="space-y-5">
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
                  <input className={inputCls} type="password" placeholder="Create password" value={form.password} onChange={set("password")} />
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
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              <button
                className="w-full rounded-full bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-150 hover:opacity-90 cursor-pointer active:scale-[0.98]"
                type="button"
                onClick={onRegister}
              >
                Register
              </button>
              <p className="text-center text-xs text-zinc-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[#5C0062] underline hover:text-[#3B0045]">Sign in</Link>
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
    <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
      <span>
        {label}
        {hint && <span className="ml-1 font-normal text-zinc-400">({hint})</span>}
      </span>
      {children}
      {error && <span className="text-xs text-red-600 font-normal">{error}</span>}
    </label>
  );
}
