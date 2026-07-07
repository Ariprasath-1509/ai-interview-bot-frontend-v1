"use client";

import { useEffect, useState } from "react";

export type SkillSetOption = { code: string; label: string };

/** Safe default so dropdowns never render empty if the fetch fails or races auth-service startup. */
const FALLBACK_OPTIONS: SkillSetOption[] = [
  { code: "JAVA_SB", label: "Java + SB" },
  { code: "JFSR", label: "JFSR" },
  { code: "REACT_JS", label: "React JS" },
  { code: "ANGULAR", label: "Angular" },
  { code: "PYTHON", label: "Python" },
  { code: "QA_ENGINEER", label: "QA Engineer" },
  { code: "PLAYWRIGHT_AUTOMATION", label: "Playwright" },
];

/** Active SKILL_SET master-data entries, for populating skill-set dropdowns dynamically. */
export function useSkillSetOptions(): { options: SkillSetOption[]; loading: boolean } {
  const [options, setOptions] = useState<SkillSetOption[]>(FALLBACK_OPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/master-data/lookups/SKILL_SET?includeInactive=false")
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
