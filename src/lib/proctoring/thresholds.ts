import type { DetectionConfig } from "./types";

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  phoneDetection: true,
  cameraBlocked: true,
  facePresence: true,
  multipleFaces: true,
  lookingAway: true,
  identityCheck: true,
  livenessCheck: true,
  meshGaze: true,
  tiled: true,
  deviceScore: 0.35,
  detectIntervalMs: 250,
};

/** Only these violations may auto-terminate the interview. */
export const TERMINATABLE_VIOLATIONS = new Set([
  "phone_detected",
  "camera_blocked",
  "multiple_faces",
  "identity_mismatch",
  "liveness_failed",
  "fullscreen_exit",
  "cross_signal",
]);

/** No auto-termination during the first N ms of active monitoring (candidate settles in). */
export const MONITORING_GRACE_PERIOD_MS = 120_000;

/** Minimum gap between counted soft-violation strikes (prevents rapid false-positive accumulation). */
export const SOFT_STRIKE_COOLDOWN_MS = 20_000;

/** Strike thresholds per violation type: warning at pause, terminate at limit (terminatable types only). */
export const STRIKE_LIMITS: Record<string, { pause: number; terminate: number }> = {
  phone_detected: { pause: 2, terminate: 3 },
  camera_blocked: { pause: 1, terminate: 2 },
  no_face: { pause: 4, terminate: 8 },
  multiple_faces: { pause: 4, terminate: 6 },
  looking_away: { pause: 6, terminate: 999 },
  gaze_away: { pause: 6, terminate: 999 },
  identity_mismatch: { pause: 2, terminate: 3 },
  liveness_failed: { pause: 2, terminate: 3 },
  fullscreen_exit: { pause: 2, terminate: 3 },
  cross_signal: { pause: 1, terminate: 2 },
};

/** Sustained blocked-camera frames before first flag. */
export const BLOCK_STREAK = 3;
export const DEVICE_STREAK = 2;
export const DEVICE_SCORE_IMMEDIATE = 0.55;
export const REMOTE_SCORE_MIN = 0.7;
export const PERSON_SCORE = 0.6;
export const FACE_PROB = 0.8;
/** Higher bar for counting an extra face (reduces mirror/reflection false positives). */
export const MULTI_FACE_PROB = 0.92;
/** Secondary face must be at least this fraction of the largest face's area. */
export const MULTI_FACE_MIN_AREA_RATIO = 0.28;
/** IoU above this between two boxes → treat as duplicate detection of same face. */
export const FACE_DEDUPE_IOU = 0.38;
/** Consecutive frames with 2+ distinct faces before flagging. */
export const MULTI_FACE_STREAK = 5;
export const FACE_AWAY_RATIO = 0.55;
export const AWAY_STREAK = 6;
export const ABSENT_STREAK = 2;
export const DARK_MEAN = 32;
export const DARK_STD = 18;
export const DARK_PCT = 0.86;
export const DARK_PIXEL = 28;
export const UNIFORM_STD = 7.5;
export const CLEAR_STREAK = 2;

/** Cosine similarity below this → possible identity swap. */
export const IDENTITY_SIMILARITY_MIN = 0.72;
export const IDENTITY_MISMATCH_STREAK = 4;
export const LIVENESS_STREAK = 3;
/** Consecutive frames (~250ms each) before flagging sustained off-screen gaze. */
export const MESH_GAZE_STREAK = 10;

export const DEVICE_CLASSES: Record<string, boolean> = {
  "cell phone": true,
  remote: true,
};
