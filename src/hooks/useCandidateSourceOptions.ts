"use client";

import { useMasterDataOptions, type MasterDataOption } from "./useMasterDataOptions";

export type CandidateSourceOption = MasterDataOption;

/** Safe default so dropdowns never render empty if the fetch fails or races auth-service startup. */
const FALLBACK_OPTIONS: CandidateSourceOption[] = [
  { code: "B2B", label: "B2B" },
  { code: "BENCH", label: "Bench" },
  { code: "MARKET", label: "Market" },
];

/** Active CANDIDATE_SOURCE master-data entries, for populating source dropdowns dynamically. */
export function useCandidateSourceOptions(): { options: CandidateSourceOption[]; loading: boolean } {
  return useMasterDataOptions("CANDIDATE_SOURCE", FALLBACK_OPTIONS);
}
