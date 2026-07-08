"use client";

import { useMasterDataOptions, type MasterDataOption } from "./useMasterDataOptions";

export type BranchOption = MasterDataOption;

/** Safe default so dropdowns never render empty if the fetch fails or races auth-service startup. */
const FALLBACK_OPTIONS: BranchOption[] = [
  { code: "DEVELOPMENT", label: "Development" },
  { code: "TESTING", label: "Testing" },
];

/** Active BRANCH master-data entries, for populating branch dropdowns dynamically. */
export function useBranchOptions(): { options: BranchOption[]; loading: boolean } {
  return useMasterDataOptions("BRANCH", FALLBACK_OPTIONS);
}
