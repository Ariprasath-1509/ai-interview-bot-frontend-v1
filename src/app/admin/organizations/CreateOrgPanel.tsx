"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/clientFetch";
import {
  type OrgType,
  type CreateOrgPayload,
} from "./types";

export function CreateOrgPanel() {
  const router = useRouter();
  const [type, setType] = useState<OrgType>("DEMO");
  const [unlimited, setUnlimited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleTypeChange(next: OrgType) {
    setType(next);
    if (next === "LIVE") {
      setUnlimited(true);
    } else {
      setUnlimited(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload: CreateOrgPayload = {
      name: fd.get("name") as string,
      code: (fd.get("code") as string).toUpperCase().trim(),
      type,
      maxInterviews: unlimited ? 0 : Number(fd.get("maxInterviews") ?? 0),
      maxCandidates: unlimited ? 0 : Number(fd.get("maxCandidates") ?? 0),
      maxClients: unlimited ? 0 : Number(fd.get("maxClients") ?? 0),
      adminName: fd.get("adminName") as string,
      adminEmail: fd.get("adminEmail") as string,
      adminPassword: fd.get("adminPassword") as string,
    };

    try {
      const res = await authFetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? data?.message ?? "Failed to create organization");
        setPending(false);
        return;
      }
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setType("DEMO");
      setUnlimited(false);
    } catch {
      setError("Network error — is the backend reachable?");
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">

      {/* Org basics */}
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Organization Name
          <input required name="name" placeholder="Acme Corp" className="input-base" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Org Code
          <input
            required
            name="code"
            placeholder="ACME"
            pattern="[A-Za-z0-9_-]+"
            title="Letters, digits, hyphens and underscores only"
            className="input-base uppercase"
          />
        </label>
      </div>

      {/* Mode picker */}
      <div className="grid gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode</span>
        <div className="flex gap-2">
          {(["DEMO", "LIVE"] as OrgType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                type === t
                  ? t === "DEMO"
                    ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-200"
                    : "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-200"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              {t === "DEMO" ? "Demo / Trial" : "Live / Production"}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {type === "DEMO"
            ? "Demo orgs can be capped at usage limits for trials."
            : "Live orgs have no usage quotas by default."}
        </p>
      </div>

      {/* Quota limits */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Usage Quotas</span>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              className="h-3.5 w-3.5 rounded"
            />
            Unlimited (no caps)
          </label>
        </div>

        {!unlimited && (
          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Max Interviews
              <input
                name="maxInterviews"
                type="number"
                min={1}
                defaultValue={5}
                required
                className="input-base"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Max Candidates
              <input
                name="maxCandidates"
                type="number"
                min={1}
                defaultValue={10}
                required
                className="input-base"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Max Clients
              <input
                name="maxClients"
                type="number"
                min={1}
                defaultValue={3}
                required
                className="input-base"
              />
            </label>
          </div>
        )}

        {unlimited && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No interview, candidate, or client caps will be enforced.
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
          First Org Admin
        </p>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Admin Name
            <input required name="adminName" placeholder="Jane Smith" className="input-base" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Admin Email
            <input required type="email" name="adminEmail" placeholder="jane@client.com" className="input-base" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Temporary Password
            <input required type="password" minLength={6} name="adminPassword" placeholder="Min 6 characters" className="input-base" />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create Organization"}
      </button>
    </form>
  );
}
