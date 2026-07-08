"use client";

import { useEffect, useState } from "react";

export type MasterDataOption = { code: string; label: string };

/** Active entries for any master-data lookup category, for populating dropdowns dynamically. */
export function useMasterDataOptions(category: string, fallback: MasterDataOption[]): { options: MasterDataOption[]; loading: boolean } {
  const [options, setOptions] = useState<MasterDataOption[]>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/master-data/lookups/${category}?includeInactive=false`)
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
  }, [category]);

  return { options, loading };
}
