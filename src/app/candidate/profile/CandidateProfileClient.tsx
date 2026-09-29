"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Edit2, Loader2, CheckCircle2, ShieldCheck, Award, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  yoePortrayed: number | null;
  noOfInterviews: number | null;
  yop: number | null;
}

const SKILL_LABEL: Record<string, string> = { JAVA_SB: "Java + Spring Boot", JFSR: "JFSR", REACT_JS: "React JS", ANGULAR: "Angular", PYTHON: "Python", QA_ENGINEER: "QA Engineer", PLAYWRIGHT_AUTOMATION: "Playwright Automation" };
const SOURCE_LABEL: Record<string, string> = { B2B: "B2B", BENCH: "Bench", MARKET: "Market" };

const RATING_STYLE: Record<string, string> = {
  ASSET: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold",
  MEDIUM: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold",
  LIABILITY: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold",
};

const STATUS_STYLE: Record<string, string> = {
  RFD: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold",
  NOT_RFD: "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)] font-bold",
};

interface Props {
  initialProfile: Profile;
}

export function CandidateProfileClient({ initialProfile }: Props) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initialProfile.name ?? "",
    contactNumber: initialProfile.contactNumber ?? "",
    officialEmail: initialProfile.officialEmail ?? "",
    personalEmail: initialProfile.personalEmail ?? "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("candidate_profile_override");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.id || parsed.id === initialProfile.id) {
          setProfile((prev) => ({ ...prev, ...parsed }));
          setForm((prev) => ({
            ...prev,
            name: parsed.name ?? prev.name,
            contactNumber: parsed.contactNumber ?? prev.contactNumber,
            officialEmail: parsed.officialEmail ?? prev.officialEmail,
            personalEmail: parsed.personalEmail ?? prev.personalEmail,
          }));
        }
      }
    } catch {
      // Ignore parse error
    }
  }, [initialProfile.id]);

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (form.name?.trim()) payload.name = form.name.trim();
      if (form.contactNumber !== undefined) payload.contactNumber = form.contactNumber.trim() || null;
      if (form.officialEmail !== undefined) payload.officialEmail = form.officialEmail.trim() || null;
      if (form.personalEmail !== undefined) payload.personalEmail = form.personalEmail.trim() || null;

      let res: Response | null = null;
      if (profile.id) {
        res = await fetch(`/api/candidates/${profile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        res = await fetch("/api/auth/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: profile.id }),
        });
      }

      const data = await res.json().catch(() => null);
      if (res.ok) {
        const updated = {
          ...(data || {}),
          name: form.name,
          contactNumber: form.contactNumber,
          officialEmail: form.officialEmail,
          personalEmail: form.personalEmail,
          id: profile.id,
        };
        setProfile((prev) => ({ ...prev, ...updated }));
        try {
          localStorage.setItem("candidate_profile_override", JSON.stringify(updated));
        } catch {
          // Ignore storage quota
        }
        setEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(data?.message || data?.error || "Failed to update profile. Please try again.");
      }
    } catch {
      setError("Network error — could not reach server.");
    } finally {
      setSaving(false);
    }
  }

  const initials = String(profile.name || profile.email || "C")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="w-full space-y-6 animate-in">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 h-48 w-48 -mr-12 -mt-12 rounded-full bg-gradient-to-br from-[#6D28D9]/10 via-[#7C3AED]/5 to-transparent blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6D28D9] to-[#4C1D95] text-white font-extrabold text-lg shadow-md shadow-purple-500/20 border border-white/20">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  {profile.name || "Candidate Profile"}
                </h1>
                {profile.batch && (
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-700 dark:text-purple-300 border border-purple-500/20 uppercase tracking-wider">
                    {profile.batch}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#6D28D9]" />
                {profile.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Profile updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-xs font-bold text-rose-800 dark:text-rose-200 shadow-sm">
          <span className="shrink-0 text-rose-600 font-extrabold">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Editable: Contact Details */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl relative overflow-hidden">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-purple-400">
            <div className="h-3 w-1 bg-[#6D28D9] rounded-full" />
            Contact Details
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#6D28D9]/30 bg-[#6D28D9]/10 px-4 py-1.5 text-xs font-bold text-[#6D28D9] dark:text-purple-300 shadow-2xs transition-all hover:bg-[#6D28D9] hover:text-white cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Details
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all px-4 py-1.5"
              >
                {saving ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                ) : (
                  <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Save</>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: profile.name ?? "",
                    contactNumber: profile.contactNumber ?? "",
                    officialEmail: profile.officialEmail ?? "",
                    personalEmail: profile.personalEmail ?? "",
                  });
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] font-bold text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]/80 transition-all cursor-pointer px-4 py-1.5"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            {editing ? (
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full Name" />
            ) : (
              <Value>{profile.name || "—"}</Value>
            )}
          </Field>
          <Field label="Login Email">
            <Value>{profile.email}</Value>
          </Field>
          <Field label="Contact Number">
            {editing ? (
              <Input type="tel" value={form.contactNumber} onChange={e => setForm(p => ({ ...p, contactNumber: e.target.value }))} placeholder="+91 98765 43210" />
            ) : (
              <Value>{profile.contactNumber || "—"}</Value>
            )}
          </Field>
          <Field label="Official Email">
            {editing ? (
              <Input type="email" value={form.officialEmail} onChange={e => setForm(p => ({ ...p, officialEmail: e.target.value }))} placeholder="official@company.com" />
            ) : (
              <Value>{profile.officialEmail || "—"}</Value>
            )}
          </Field>
          <Field label="Personal Email">
            {editing ? (
              <Input type="email" value={form.personalEmail} onChange={e => setForm(p => ({ ...p, personalEmail: e.target.value }))} placeholder="personal@email.com" />
            ) : (
              <Value>{profile.personalEmail || "—"}</Value>
            )}
          </Field>
        </div>
      </div>

      {/* Read-only: Profile Info */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-5">
          <div className="h-3 w-1 bg-emerald-500 rounded-full" />
          Organization &amp; Skills
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label="Batch"><Value>{profile.batch || "—"}</Value></Field>
          <Field label="Source"><Value>{profile.source ? (SOURCE_LABEL[profile.source] ?? profile.source) : "—"}</Value></Field>
          <Field label="Skill Set"><Value>{profile.skillSet ? (SKILL_LABEL[profile.skillSet] ?? profile.skillSet) : "—"}</Value></Field>
          <Field label="Year of Passing"><Value>{profile.yop ?? "—"}</Value></Field>
          <Field label="YOE"><Value>{profile.yoePortrayed ?? "—"}</Value></Field>
        </div>
      </div>

      {/* Read-only: Manager Assessment */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-5">
          <div className="h-3 w-1 bg-amber-500 rounded-full" />
          Manager Assessment
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            {profile.candidateStatus ? (
              <div className="py-1">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs ${STATUS_STYLE[profile.candidateStatus] ?? ""}`}>
                  {profile.candidateStatus === "RFD" ? "RFD" : "Not RFD"}
                </span>
              </div>
            ) : (
              <Value muted>Not assessed</Value>
            )}
          </Field>
          <Field label="Rating">
            {profile.rating ? (
              <div className="py-1">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs ${RATING_STYLE[profile.rating] ?? ""}`}>
                  {profile.rating}
                </span>
              </div>
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
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-[var(--text-primary)]">{label}</Label>
      {children}
    </div>
  );
}

function Value({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 px-3.5 py-2.5 text-sm font-semibold ${muted ? "text-[var(--text-secondary)] italic" : "text-[var(--text-primary)]"}`}>
      {children}
    </div>
  );
}