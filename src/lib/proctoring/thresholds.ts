import type { DetectionConfig } from "./types";

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  phoneDetection: true,
  cameraBlocked: true,
  facePresence: true,
  multipleFaces: true,
  lookingAway: false,    // disabled: too many false positives when candidate thinks/reads
  identityCheck: false,  // disabled: BlazeFace 5-landmark geometry ≠ face recognition
  livenessCheck: false,  // disabled: face-height blink heuristic is unreliable
  meshGaze: false,       // disabled: duplicate of lookingAway with same false-positive issues
  tiled: false,          // disabled: 7× tile multiplier was causing false phone detections
  deviceScore: 0.62,     // raised from 0.35 — COCO-SSD needs high confidence for cell phone class
  detectIntervalMs: 500, // raised from 250 — less CPU, less flicker between frames
};

/**
 * Violation types that can auto-terminate the interview.
 * identity_mismatch and liveness_failed removed — their detectors are not
 * reliable enough to justify termination (too many false positives).
 */
export const TERMINATABLE_VIOLATIONS = new Set([
  "phone_detected",
  "camera_blocked",
  "multiple_faces",
  "fullscreen_exit",
  "cross_signal",
]);

/** No auto-termination during the first N ms of active monitoring (candidate settles in). */
export const MONITORING_GRACE_PERIOD_MS = 300_000; // 5 minutes (was 2 minutes)

/** Minimum gap between counted soft-violation strikes (prevents rapid accumulation). */
export const SOFT_STRIKE_COOLDOWN_MS = 30_000; // 30 s (was 20 s)

/**
 * Strike thresholds per violation type.
 * pause = show warning modal  |  terminate = end interview (only if terminatable)
 */
export const STRIKE_LIMITS: Record<string, { pause: number; terminate: number }> = {
  phone_detected:    { pause: 3,   terminate: 5   }, // more lenient — COCO-SSD false-positives
  camera_blocked:    { pause: 2,   terminate: 5   }, // uniform walls caused premature flags
  no_face:           { pause: 8,   terminate: 999 }, // never terminate — brief absences are normal
  multiple_faces:    { pause: 6,   terminate: 12  }, // background photos/posters cause false positives
  looking_away:      { pause: 10,  terminate: 999 }, // never terminate — looking away while thinking
  gaze_away:         { pause: 10,  terminate: 999 }, // never terminate
  identity_mismatch: { pause: 999, terminate: 999 }, // disabled — unreliable detector
  liveness_failed:   { pause: 999, terminate: 999 }, // disabled — unreliable blink heuristic
  fullscreen_exit:   { pause: 2,   terminate: 3   },
  cross_signal:      { pause: 1,   terminate: 2   },
};

// ── Per-frame detection thresholds ──────────────────────────────────────────

/** Frames (~500 ms each) of solid darkness before flagging camera as blocked. */
export const BLOCK_STREAK = 12; // ~6 seconds sustained (was 3 = 750 ms)

/** Frames with a device candidate before counting as a strike. */
export const DEVICE_STREAK = 5; // ~2.5 seconds (was 2 = 500 ms)

/** A single frame above this score immediately maxes the device streak. */
export const DEVICE_SCORE_IMMEDIATE = 0.82; // was 0.55

/** Minimum confidence for "remote" class (remotes look like phones at low confidence). */
export const REMOTE_SCORE_MIN = 0.85; // was 0.70

/** Minimum COCO person confidence to count as a second person in frame. */
export const PERSON_SCORE = 0.72; // was 0.60

/** Minimum BlazeFace probability to count as a valid face detection. */
export const FACE_PROB = 0.88; // was 0.80

/** Confidence required for a secondary face — high bar reduces poster/photo false positives. */
export const MULTI_FACE_PROB = 0.96; // was 0.92

/**
 * Secondary face must be at least 50 % of the primary face area.
 * Prevents small background detections (photos on wall) from counting.
 */
export const MULTI_FACE_MIN_AREA_RATIO = 0.50; // was 0.28

/** IoU above this → two detections are the same face (mirror / reflection dedup). */
export const FACE_DEDUPE_IOU = 0.28; // was 0.38 (more aggressive dedup)

/** Frames of sustained dual-face detection before a strike (~10 seconds at 500 ms). */
export const MULTI_FACE_STREAK = 20; // was 5 (= 1.25 s — way too fast)

/** Head turn ratio threshold before "looking away" fires. */
export const FACE_AWAY_RATIO = 0.65; // was 0.55

/** Frames of sustained looking-away before a reason is appended. */
export const AWAY_STREAK = 20; // was 6

/** Frames of no detected face before "absent" fires (~4 seconds). */
export const ABSENT_STREAK = 8; // was 2 (= 500 ms)

// Camera-blocked brightness thresholds (only flag very dark, nearly black frames)
export const DARK_MEAN   = 16;  // was 32 — only truly dark/off camera
export const DARK_STD    = 10;  // was 18
export const DARK_PCT    = 0.94; // was 0.86
export const DARK_PIXEL  = 18;  // was 28

/**
 * Pixel std-dev below which a frame is "too uniform to show a real person".
 * Lowered from 7.5 → 3.5 so plain white/grey walls no longer trigger this.
 */
export const UNIFORM_STD = 3.5; // was 7.5

/** Clean frames required before all episode state is reset (~5 seconds). */
export const CLEAR_STREAK = 10; // was 2 (= 500 ms — caused rapid re-striking)

/** Cosine similarity below which a face may not match the enrolled identity. */
export const IDENTITY_SIMILARITY_MIN = 0.58; // was 0.72 (kept for reference; check is disabled)

/** Frames below similarity before an identity mismatch episode is flagged. */
export const IDENTITY_MISMATCH_STREAK = 40; // was 4 (kept for reference; check is disabled)

/** Liveness streak (disabled — kept as reference). */
export const LIVENESS_STREAK = 999; // effectively off

/** Sustained off-screen gaze frames before gaze_away fires. */
export const MESH_GAZE_STREAK = 25; // was 10

export const DEVICE_CLASSES: Record<string, boolean> = {
  "cell phone": true,
  remote: true,
};
