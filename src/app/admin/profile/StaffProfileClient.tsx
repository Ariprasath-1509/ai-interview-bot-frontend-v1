"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Shield, Building2, Key, CheckCircle2, Edit2, Loader2, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Profile {
  id: string;
  role: string;
  email: string;
  name: string | null;
  contactNumber: string | null;
  adminSource?: string;
  branch?: string;
}

interface Props {
  initialProfile: Profile;
}

export function StaffProfileClient({ initialProfile }: Props) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initialProfile.name ?? "",
    email: initialProfile.email ?? "",
    contactNumber: initialProfile.contactNumber ?? "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("staff_profile_override");
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile((prev) => ({ ...prev, ...parsed }));
        setForm((prev) => ({
          ...prev,
          name: parsed.name ?? prev.name,
          contactNumber: parsed.contactNumber ?? prev.contactNumber,
        }));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (form.name?.trim()) payload.name = form.name.trim();
      if (form.contactNumber !== undefined) payload.contactNumber = form.contactNumber.trim() || null;

      const res = await fetch("/api/auth/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        const updated = {
          ...(data || {}),
          name: form.name,
          contactNumber: form.contactNumber,
        };
        setProfile((prev) => ({ ...prev, ...updated }));
        try {
          localStorage.setItem("staff_profile_override", JSON.stringify(updated));
        } catch {
          // Ignore quota error
        }
        setEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message || data?.error;
        setError(msg || "Failed to update profile");
      }
    } catch {
      setError("Network error — is the backend reachable?");
    } finally {
      setSaving(false);
    }
  }

  const initials = String(profile.name || profile.email || "U")
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
                  {profile.name || "Staff User"}
                </h1>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-700 dark:text-purple-300 border border-purple-500/20 uppercase tracking-wider">
                  {(profile.role || "STAFF").replace(/_/g, " ")}
                </span>
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

      {/* Personal Details Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl relative overflow-hidden">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-purple-400">
            <div className="h-3 w-1 bg-[#6D28D9] rounded-full" />
            Personal Details
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#6D28D9]/30 bg-[#6D28D9]/10 px-4 py-1.5 text-xs font-bold text-[#6D28D9] dark:text-purple-300 shadow-2xs transition-all hover:bg-[#6D28D9] hover:text-white cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile
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
                  setError(null);
                  setForm({
                    name: profile.name ?? "",
                    email: profile.email ?? "",
                    contactNumber: profile.contactNumber ?? "",
                  });
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] font-bold text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]/80 transition-all cursor-pointer px-4 py-1.5"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            {editing ? (
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Enter full name" />
            ) : (
              <Value>{profile.name || "—"}</Value>
            )}
          </Field>
          <Field label="Login Email">
            {editing ? (
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@company.com" />
            ) : (
              <Value>{profile.email}</Value>
            )}
          </Field>
          <Field label="Contact Number">
            {editing ? (
              <Input type="tel" value={form.contactNumber} onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))} placeholder="+91 98765 43210" />
            ) : (
              <Value>{profile.contactNumber || "—"}</Value>
            )}
          </Field>
          <Field label="Role">
            <Value>{profile.role.replace(/_/g, " ")}</Value>
          </Field>
          {profile.branch && (
            <Field label="Branch">
              <Value>{profile.branch}</Value>
            </Field>
          )}
          {profile.adminSource && (
            <Field label="Admin Source">
              <Value>{profile.adminSource}</Value>
            </Field>
          )}
        </div>
      </div>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePassword() {
    setError(null);
    setSuccess(false);
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data?.error ?? "Failed to change password");
      }
    } catch {
      setError("Network error — is the backend reachable?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-5">
        <div className="h-3 w-1 bg-purple-500 rounded-full" />
        Security &amp; Password
      </div>

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          Password changed successfully.
        </div>
      )}
      {error && <p className="mb-4 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current Password">
          <Input
            type="password"
            placeholder="••••••••"
            value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
          />
        </Field>
        <Field label="New Password">
          <Input
            type="password"
            placeholder="At least 6 characters"
            minLength={6}
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
          />
        </Field>
        <Field label="Confirm New Password">
          <Input
            type="password"
            placeholder="Repeat new password"
            minLength={6}
            value={form.confirmPassword}
            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          onClick={handleChangePassword}
          disabled={saving || !form.currentPassword || !form.newPassword}
          className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all px-5 py-2 flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Changing…</>
          ) : (
            <><Key className="h-4 w-4" />Change Password</>
          )}
        </Button>
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

function Value({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)]">
      {children}
    </div>
  );
}
