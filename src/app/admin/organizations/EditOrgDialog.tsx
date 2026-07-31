"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/clientFetch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FEATURE_DEFS,
  type FeatureKey,
  type OrgFeatureStates,
  type OrgRow,
  type OrgStatus,
  type OrgType,
} from "./types";

export function EditOrgDialog({ org }: { org: OrgRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<OrgType>(org.type);
  const [status, setStatus] = useState<OrgStatus>(org.status);
  const [unlimited, setUnlimited] = useState(
    org.maxInterviews == null || (org.maxInterviews === 0 && org.maxCandidates === 0 && org.maxClients === 0)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [features, setFeatures] = useState<OrgFeatureStates | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresPending, setFeaturesPending] = useState(false);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const [featuresSaved, setFeaturesSaved] = useState(false);

  useEffect(() => {
    if (!open || features || featuresLoading) return;
    setFeaturesLoading(true);
    authFetch(`/api/admin/organizations/${org.code}/features`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setFeatures(data.features))
      .catch(() => setFeaturesError("Failed to load feature entitlements"))
      .finally(() => setFeaturesLoading(false));
  }, [open, features, featuresLoading, org.code]);

  function toggleFeature(key: FeatureKey) {
    setFeatures((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
    setFeaturesSaved(false);
  }

  async function saveFeatures() {
    if (!features) return;
    setFeaturesPending(true);
    setFeaturesError(null);
    try {
      const res = await authFetch(`/api/admin/organizations/${org.code}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFeaturesError(data?.error ?? "Failed to save feature entitlements");
        return;
      }
      const data = await res.json();
      setFeatures(data.features);
      setFeaturesSaved(true);
    } catch {
      setFeaturesError("Network error — is the backend reachable?");
    } finally {
      setFeaturesPending(false);
    }
  }

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
    const payload = {
      name: fd.get("name") as string,
      type,
      status,
      maxInterviews: unlimited ? null : Number(fd.get("maxInterviews") ?? 0),
      maxCandidates: unlimited ? null : Number(fd.get("maxCandidates") ?? 0),
      maxClients: unlimited ? null : Number(fd.get("maxClients") ?? 0),
    };

    try {
      const res = await authFetch(`/api/admin/organizations/${org.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? data?.message ?? "Failed to update organization");
        setPending(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error — is the backend reachable?");
    }
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {org.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-1 pb-4">

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
            <input name="name" defaultValue={org.name} required className="input-base w-full" />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode</span>
            <div className="flex gap-2">
              {(["DEMO", "LIVE"] as OrgType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
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
          </div>

          {/* Status */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</span>
            <div className="flex gap-2">
              {(["ACTIVE", "SUSPENDED"] as OrgStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
                    status === s
                      ? s === "ACTIVE"
                        ? "border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-200"
                        : "border-red-400 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  {s === "ACTIVE" ? "Active" : "Suspended"}
                </button>
              ))}
            </div>
          </div>

          {/* Quotas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Usage Quotas</span>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => setUnlimited(e.target.checked)}
                  className="h-3.5 w-3.5 rounded"
                />
                Unlimited
              </label>
            </div>
            {!unlimited && (
              <div className="grid grid-cols-3 gap-3">
                <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Max Interviews
                  <input name="maxInterviews" type="number" min={1} defaultValue={org.maxInterviews ?? 5} required className="input-base" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Max Candidates
                  <input name="maxCandidates" type="number" min={1} defaultValue={org.maxCandidates ?? 10} required className="input-base" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Max Clients
                  <input name="maxClients" type="number" min={1} defaultValue={org.maxClients ?? 3} required className="input-base" />
                </label>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>

        <div className="space-y-3 border-t border-zinc-200 px-1 pb-1 pt-4 dark:border-zinc-800">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Feature access</span>
          {featuresLoading && <p className="text-xs text-zinc-500">Loading…</p>}
          {featuresError && <p className="text-sm text-destructive">{featuresError}</p>}
          {features && (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {FEATURE_DEFS.map((f) => (
                  <label
                    key={f.key}
                    className="flex cursor-pointer items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                    title={f.description}
                  >
                    <input
                      type="checkbox"
                      checked={features[f.key] ?? true}
                      onChange={() => toggleFeature(f.key)}
                      className="mt-0.5 h-3.5 w-3.5 rounded"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                {featuresSaved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>}
                <Button type="button" size="sm" variant="outline" disabled={featuresPending} onClick={saveFeatures}>
                  {featuresPending ? "Saving…" : "Save feature access"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
