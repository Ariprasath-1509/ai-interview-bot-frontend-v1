export type ProctoringMode = "video" | "light";

/** MARKET → full video proctoring; BENCH, B2B, and unknown → light integrity only. */
export function resolveProctoringMode(source: string | null | undefined): ProctoringMode {
  return source === "MARKET" ? "video" : "light";
}

export function integrityModeLabel(mode: ProctoringMode): string {
  return mode === "video"
    ? "Video proctoring, fullscreen, and tab-switch monitoring"
    : "Fullscreen and tab-switch monitoring only";
}
