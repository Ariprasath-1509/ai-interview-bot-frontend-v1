"use client";

import { useEffect, useState } from "react";

export type BranchOption = { code: string; label: string };

/** Safe default so dropdowns never render empty if the fetch fails or races auth-service startup. */
const FALLBACK_OPTIONS: BranchOption[] = [
  { code: "DEVELOPMENT", label: "Development" },
  { code: "TESTING", label: "Testing" },
];

/** Active BRANCH master-data entries, for populating branch dropdowns dynamically. */
export function useBranchOptions(): { options: BranchOption[]; loading: boolean } {
  const [options, setOptions] = useState<BranchOption[]>(FALLBACK_OPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/master-data/lookups/BRANCH?includeInactive=false")
      .then((res) => res.json())
      .then((json: { success?: boolean; data?: { code: string; label: string }[] }) => {
        if (cancelled) return;
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setOptions(json.data.map((e) => ({ code: e.code, label: e.label })));
        }
      })
      .catch(() => {
        /* keep fallback options */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading };
}
