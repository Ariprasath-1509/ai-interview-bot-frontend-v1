"use client";

import { useMasterDataOptions, type MasterDataOption } from "./useMasterDataOptions";

export type SkillSetOption = MasterDataOption;

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
  return useMasterDataOptions("SKILL_SET", FALLBACK_OPTIONS);
}
