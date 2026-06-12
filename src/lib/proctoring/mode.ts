export type ProctoringMode = "video" | "light";

/** Fallback when interview API does not include proctoringMode. Backend admin settings are the source of truth. */
export function resolveProctoringMode(source: string | null | undefined): ProctoringMode {
  return source === "MARKET" ? "video" : "light";
}

export function integrityModeLabel(mode: ProctoringMode): string {
  return mode === "video"
    ? "Video proctoring, fullscreen, and tab-switch monitoring"
    : "Fullscreen and tab-switch monitoring only";
}
