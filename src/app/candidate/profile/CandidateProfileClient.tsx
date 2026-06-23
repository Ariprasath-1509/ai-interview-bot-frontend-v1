"use client";

import { useState } from "react";

interface Profile {
  id: string;
  name: string;
  email: string;
  contactNumber: string | null;
  officialEmail: string | null;
  personalEmail: string | null;
  batch: string | null;
  source: string | null;
  candidateStatus: string | null;
  rating: string | null;
  skillSet: string | null;
  yoeActual: number | null;
  yoePortrayed: number | null;
  noOfInterviews: number | null;
  yop: number | null;
}

const SKILL_LABEL: Record<string, string> = { JAVA_SB: "Java + Spring Boot", JFSR: "JFSR", REACT_JS: "React JS", ANGULAR: "Angular", PYTHON: "Python", QA_ENGINEER: "QA Engineer", PLAYWRIGHT_AUTOMATION: "Playwright Automation" };
const SOURCE_LABEL: Record<string, string> = { B2B: "B2B", BENCH: "Bench", MARKET: "Market" };

const RATING_STYLE: Record<string, string> = {
  ASSET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  LIABILITY: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_STYLE: Record<string, string> = {
  RFD: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  NOT_RFD: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

interface Props {
  initialProfile: Profile;
}

export function CandidateProfileClient({ initialProfile }: Props) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: initialProfile.name ?? "",
    contactNumber: initialProfile.contactNumber ?? "",
    officialEmail: initialProfile.officialEmail ?? "",
    personalEmail: initialProfile.personalEmail ?? "",
  });

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/auth/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  const inputCls = "rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-700 w-full";

  return (
    <>
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          Profile updated successfully.
        </div>
      )}

      <div className="space-y-6">
        {/* Editable Section */}
        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Contact Details</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      name: profile.name ?? "",
                      contactNumber: profile.contactNumber ?? "",
                      officialEmail: profile.officialEmail ?? "",
                      personalEmail: profile.personalEmail ?? "",
                    });
                  }}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              {editing ? (
                <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              ) : (
                <Value>{profile.name || "—"}</Value>
              )}
            </Field>
            <Field label="Login Email">
              <Value>{profile.email}</Value>
            </Field>
            <Field label="Contact Number">
              {editing ? (
                <input className={inputCls} type="tel" value={form.contactNumber} onChange={e => setForm(p => ({ ...p, contactNumber: e.target.value }))} />
              ) : (
                <Value>{profile.contactNumber || "—"}</Value>
              )}
            </Field>
            <Field label="Official Email">
              {editing ? (
                <input className={inputCls} type="email" value={form.officialEmail} onChange={e => setForm(p => ({ ...p, officialEmail: e.target.value }))} />
              ) : (
                <Value>{profile.officialEmail || "—"}</Value>
              )}
            </Field>
            <Field label="Personal Email">
              {editing ? (
                <input className={inputCls} type="email" value={form.personalEmail} onChange={e => setForm(p => ({ ...p, personalEmail: e.target.value }))} />
              ) : (
                <Value>{profile.personalEmail || "—"}</Value>
              )}
            </Field>
          </div>
        </div>

        {/* Read-only: Profile Info */}
        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Batch"><Value>{profile.batch || "—"}</Value></Field>
            <Field label="Source"><Value>{profile.source ? (SOURCE_LABEL[profile.source] ?? profile.source) : "—"}</Value></Field>
            <Field label="Skill Set"><Value>{profile.skillSet ? (SKILL_LABEL[profile.skillSet] ?? profile.skillSet) : "—"}</Value></Field>
            <Field label="Year of Passing"><Value>{profile.yop ?? "—"}</Value></Field>
            <Field label="YOE (Actual)"><Value>{profile.yoeActual ?? "—"}</Value></Field>
            <Field label="YOE (Portrayed)"><Value>{profile.yoePortrayed ?? "—"}</Value></Field>
          </div>
        </div>

        {/* Read-only: Manager Assessment */}
        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">Manager Assessment</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status">
              {profile.candidateStatus ? (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[profile.candidateStatus] ?? ""}`}>
                  {profile.candidateStatus === "RFD" ? "RFD" : "Not RFD"}
                </span>
              ) : (
                <Value muted>Not assessed</Value>
              )}
            </Field>
            <Field label="Rating">
              {profile.rating ? (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${RATING_STYLE[profile.rating] ?? ""}`}>
                  {profile.rating}
                </span>
              ) : (
                <Value muted>Not rated</Value>
              )}
            </Field>
            <Field label="No. of Interviews">
              <Value>{profile.noOfInterviews ?? 0}</Value>
            </Field>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

function Value({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p className={`text-sm font-medium ${muted ? "text-zinc-400 dark:text-zinc-500 italic" : "text-zinc-900 dark:text-zinc-100"}`}>
      {children}
    </p>
  );
}