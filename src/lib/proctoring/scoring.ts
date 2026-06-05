import type { ProctorEvent, ProctorEventType, VideoProctoringSnapshot } from "./types";

const PENALTIES: Partial<Record<ProctorEventType, number>> = {
  phone_detected: 25,
  camera_blocked: 20,
  multiple_faces: 30,
  no_face: 10,
  looking_away: 8,
  gaze_away: 5,
  identity_mismatch: 35,
  liveness_failed: 20,
  fullscreen_exit: 15,
  cross_signal: 25,
  clear: 0,
};

export function computeIntegrityScore(events: ProctorEvent[]): number {
  let score = 100;
  for (const event of events) {
    if (event.type === "clear") continue;
    score -= PENALTIES[event.type] ?? 5;
  }
  return Math.max(0, Math.min(100, score));
}

export function integrityLabel(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 80) return { label: "High integrity", tone: "good" };
  if (score >= 50) return { label: "Moderate risk", tone: "warn" };
  return { label: "Low integrity", tone: "bad" };
}

export function formatProctorEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildSyncPayload(snapshot: VideoProctoringSnapshot, events: ProctorEvent[]) {
  return {
    events,
    strikes: snapshot.strikes,
    status: snapshot.status,
    integrityScore: computeIntegrityScore(events),
    summary: {
      totalEvents: events.length,
      violationLevel: snapshot.violationLevel,
      lastReasons: snapshot.lastReasons,
      note: snapshot.note,
    },
  };
}
