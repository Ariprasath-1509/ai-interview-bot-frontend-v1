type BlazeFaceLike = {
  landmarks?: number[][];
  topLeft?: number[];
  bottomRight?: number[];
};

export type LivenessState = {
  lastBlinkAt: number;
  blinkCount: number;
  /** Rolling buffer of the last N face heights for stable blink detection. */
  heightBuffer: number[];
  blinkPending: boolean;
  sessionStartAt: number;
  faceVisibleSince: number | null;
  identityMismatchStreak: number;
  livenessStreak: number;
  meshGazeStreak: number;
};

/** Number of frames kept in the rolling face-height buffer. */
const HEIGHT_BUFFER_SIZE = 8;

/**
 * Minimum face must be visible before we start checking for blinks.
 * Prevents spurious liveness flags during the first few seconds of monitoring.
 */
const MIN_VISIBLE_BEFORE_LIVENESS_MS = 60_000; // 1 minute

/**
 * A blink is detected when the current face height drops more than this fraction
 * below the rolling average of the last N frames.
 * Using a rolling average (not just the previous frame) eliminates false triggers
 * from gradual head movement, lighting changes, or model variance.
 */
const BLINK_DIP_RATIO = 0.82; // current height < 82 % of rolling average → blink dip

/**
 * Recovery: height must return to at least this fraction of the rolling average
 * before the blink is confirmed (filters out permanent occlusion / face leaving frame).
 */
const BLINK_RECOVERY_RATIO = 0.91;

/**
 * If no blink is detected for this many milliseconds after the minimum visible
 * window has passed, flag a liveness issue.
 * 3 minutes is very lenient — most people blink at least once per minute.
 */
const LIVENESS_NO_BLINK_TIMEOUT_MS = 180_000; // 3 minutes

export function createLivenessState(): LivenessState {
  const now = Date.now();
  return {
    lastBlinkAt: now,
    blinkCount: 0,
    heightBuffer: [],
    blinkPending: false,
    sessionStartAt: now,
    faceVisibleSince: null,
    identityMismatchStreak: 0,
    livenessStreak: 0,
    meshGazeStreak: 0,
  };
}

function faceHeight(face: BlazeFaceLike): number {
  if (face.topLeft && face.bottomRight) {
    return Math.max(0, face.bottomRight[1] - face.topLeft[1]);
  }
  const lm = face.landmarks;
  if (!lm || lm.length < 4) return 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pt of lm) {
    minY = Math.min(minY, pt[1]);
    maxY = Math.max(maxY, pt[1]);
  }
  return maxY > minY ? maxY - minY : 0;
}

function rollingAverage(buf: number[]): number {
  if (buf.length === 0) return 0;
  return buf.reduce((s, v) => s + v, 0) / buf.length;
}

/**
 * Detect blinks using a rolling average of face-box heights instead of
 * comparing to just the previous frame. This eliminates false positives from:
 *  - Gradual head tilts (height drifts slowly, not sharply)
 *  - Natural head movement during interview (leaning forward/back)
 *  - Single-frame model variance (noisy single-frame outliers)
 */
export function updateBlinkFromFace(state: LivenessState, face: BlazeFaceLike): void {
  const h = faceHeight(face);
  if (h <= 0) return;

  // Maintain rolling buffer
  state.heightBuffer.push(h);
  if (state.heightBuffer.length > HEIGHT_BUFFER_SIZE) {
    state.heightBuffer.shift();
  }

  // Need at least half the buffer filled before we can make reliable comparisons
  if (state.heightBuffer.length < Math.ceil(HEIGHT_BUFFER_SIZE / 2)) return;

  // Use rolling average excluding the current frame for comparison
  const prevBuffer = state.heightBuffer.slice(0, -1);
  if (prevBuffer.length === 0) return;
  const avg = rollingAverage(prevBuffer);

  if (avg <= 0) return;

  // Blink start: sharp drop below rolling average
  if (!state.blinkPending && h < avg * BLINK_DIP_RATIO) {
    state.blinkPending = true;
  }
  // Blink confirmed: height recovers back up (confirms it was a real blink, not departure)
  else if (state.blinkPending && h >= avg * BLINK_RECOVERY_RATIO) {
    state.blinkCount += 1;
    state.lastBlinkAt = Date.now();
    state.blinkPending = false;
  }
}

export function isGazeAwayFromLandmarks(landmarks: number[][]): boolean {
  if (landmarks.length < 4) return false;

  const rightEye = landmarks[0];
  const leftEye  = landmarks[1];
  const nose     = landmarks[2];
  const mouth    = landmarks[3];
  if (!rightEye || !leftEye || !nose || !mouth) return false;

  const eyeMidX   = (rightEye[0] + leftEye[0]) / 2;
  const eyeMidY   = (rightEye[1] + leftEye[1]) / 2;
  const interEye  = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
  if (interEye < 12) return true;

  const yaw         = (nose[0] - eyeMidX) / interEye;
  const pitch       = (nose[1] - eyeMidY) / interEye;
  const roll        = Math.abs(leftEye[1] - rightEye[1]) / interEye;
  const mouthOffset = Math.abs(mouth[0] - eyeMidX) / interEye;

  // Lenient thresholds — natural interview movement should not flag.
  // Raised from (0.52, 0.58, 0.38, 0.45) to give more head-turn freedom.
  return (
    Math.abs(yaw)   > 0.60 ||
    Math.abs(pitch) > 0.65 ||
    roll            > 0.45 ||
    mouthOffset     > 0.52
  );
}

/**
 * Returns true only when:
 * 1. The face has been continuously visible for at least MIN_VISIBLE_BEFORE_LIVENESS_MS
 * 2. No blink has been detected for LIVENESS_NO_BLINK_TIMEOUT_MS
 *
 * This prevents false liveness failures during the early part of the interview,
 * and gives candidates 3 minutes between blinks before flagging (was 60 seconds).
 */
export function checkLivenessTimeout(
  state: LivenessState,
  faceVisible: boolean,
  now = Date.now(),
): boolean {
  if (!faceVisible) {
    state.faceVisibleSince = null;
    state.livenessStreak = 0;
    return false;
  }

  if (state.faceVisibleSince == null) state.faceVisibleSince = now;

  const visibleMs = now - state.faceVisibleSince;
  const sinceBlink = now - state.lastBlinkAt;

  // Don't flag until the face has been visible long enough for reliable measurement
  if (visibleMs < MIN_VISIBLE_BEFORE_LIVENESS_MS) return false;

  return sinceBlink >= LIVENESS_NO_BLINK_TIMEOUT_MS;
}
