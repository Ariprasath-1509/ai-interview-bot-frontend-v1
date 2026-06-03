type BlazeFaceLike = {
  landmarks?: number[][];
  topLeft?: number[];
  bottomRight?: number[];
};

export type LivenessState = {
  lastBlinkAt: number;
  blinkCount: number;
  blinkPending: boolean;
  lastFaceHeight: number;
  sessionStartAt: number;
  identityMismatchStreak: number;
  livenessStreak: number;
  meshGazeStreak: number;
  faceVisibleSince: number | null;
};

export function createLivenessState(): LivenessState {
  const now = Date.now();
  return {
    lastBlinkAt: now,
    blinkCount: 0,
    blinkPending: false,
    lastFaceHeight: 0,
    sessionStartAt: now,
    identityMismatchStreak: 0,
    livenessStreak: 0,
    meshGazeStreak: 0,
    faceVisibleSince: null,
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

/** Detect blink via brief face-box height drop (works with BlazeFace). */
export function updateBlinkFromFace(state: LivenessState, face: BlazeFaceLike): void {
  const h = faceHeight(face);
  if (h <= 0) return;

  if (state.lastFaceHeight > 0 && h < state.lastFaceHeight * 0.9) {
    state.blinkPending = true;
  } else if (state.blinkPending && h >= state.lastFaceHeight * 0.94) {
    state.blinkCount += 1;
    state.lastBlinkAt = Date.now();
    state.blinkPending = false;
  }
  state.lastFaceHeight = h;
}

export function isGazeAwayFromLandmarks(landmarks: number[][]): boolean {
  if (landmarks.length < 4) return false;

  const rightEye = landmarks[0];
  const leftEye = landmarks[1];
  const nose = landmarks[2];
  const mouth = landmarks[3];
  if (!rightEye || !leftEye || !nose || !mouth) return false;

  const eyeMidX = (rightEye[0] + leftEye[0]) / 2;
  const eyeMidY = (rightEye[1] + leftEye[1]) / 2;
  const interEye = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
  if (interEye < 12) return true;

  const yaw = (nose[0] - eyeMidX) / interEye;
  const pitch = (nose[1] - eyeMidY) / interEye;
  const roll = Math.abs(leftEye[1] - rightEye[1]) / interEye;
  const mouthOffset = Math.abs(mouth[0] - eyeMidX) / interEye;

  return (
    Math.abs(yaw) > 0.38 ||
    Math.abs(pitch) > 0.42 ||
    roll > 0.28 ||
    mouthOffset > 0.35
  );
}

export function checkLivenessTimeout(state: LivenessState, faceVisible: boolean, now = Date.now()): boolean {
  if (!faceVisible) {
    state.faceVisibleSince = null;
    state.livenessStreak = 0;
    return false;
  }
  if (state.faceVisibleSince == null) state.faceVisibleSince = now;

  const visibleMs = now - state.faceVisibleSince;
  const sinceBlink = now - state.lastBlinkAt;
  if (visibleMs < 45_000) return false;
  return sinceBlink >= 75_000;
}
