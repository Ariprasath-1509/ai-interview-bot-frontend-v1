"use client";

import { useState } from "react";

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

const inputCls = "rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-700 w-full";

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

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch("/api/auth/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data?.error ?? "Failed to update profile");
      }
    } catch {
      setError("Network error — is the backend reachable?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          Profile updated successfully.
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Personal Details</h2>
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
                    setError(null);
                    setForm({
                      name: profile.name ?? "",
                      email: profile.email ?? "",
                      contactNumber: profile.contactNumber ?? "",
                    });
                  }}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              {editing ? (
                <input className={inputCls} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              ) : (
                <Value>{profile.name || "—"}</Value>
              )}
            </Field>
            <Field label="Login Email">
              {editing ? (
                <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              ) : (
                <Value>{profile.email}</Value>
              )}
            </Field>
            <Field label="Contact Number">
              {editing ? (
                <input className={inputCls} type="tel" value={form.contactNumber} onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))} />
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
    </>
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
    <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">Change Password</h2>

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          Password changed successfully.
        </div>
      )}
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current Password">
          <input
            className={inputCls}
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
          />
        </Field>
        <Field label="New Password">
          <input
            className={inputCls}
            type="password"
            minLength={6}
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
          />
        </Field>
        <Field label="Confirm New Password">
          <input
            className={inputCls}
            type="password"
            minLength={6}
            value={form.confirmPassword}
            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
        </Field>
      </div>

      <button
        onClick={handleChangePassword}
        disabled={saving || !form.currentPassword || !form.newPassword}
        className="mt-4 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {saving ? "Changing…" : "Change Password"}
      </button>
    </div>
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

function Value({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{children}</p>;
}
