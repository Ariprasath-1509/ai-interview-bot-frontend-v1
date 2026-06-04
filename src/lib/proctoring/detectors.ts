import type { BlazeFaceModel, CocoModel, DetectionConfig, DetectionResult } from "./types";
import { compareIdentity, extractIdentityVectorFromFace, type IdentityBaseline } from "./enrollment";
import {
  checkLivenessTimeout,
  createLivenessState,
  isGazeAwayFromLandmarks,
  updateBlinkFromFace,
  type LivenessState,
} from "./gazeLiveness";
import {
  ABSENT_STREAK,
  AWAY_STREAK,
  BLOCK_STREAK,
  CLEAR_STREAK,
  DARK_MEAN,
  DARK_PCT,
  DARK_PIXEL,
  DARK_STD,
  DEVICE_CLASSES,
  DEVICE_SCORE_IMMEDIATE,
  DEVICE_STREAK,
  FACE_AWAY_RATIO,
  FACE_DEDUPE_IOU,
  FACE_PROB,
  IDENTITY_MISMATCH_STREAK,
  IDENTITY_SIMILARITY_MIN,
  LIVENESS_STREAK,
  MESH_GAZE_STREAK,
  MULTI_FACE_MIN_AREA_RATIO,
  MULTI_FACE_PROB,
  MULTI_FACE_STREAK,
  PERSON_SCORE,
  REMOTE_SCORE_MIN,
  UNIFORM_STD,
} from "./thresholds";

type BrightnessStats = {
  mean: number;
  std: number;
  darkPct: number;
};

type FaceLike = {
  probability?: unknown;
  landmarks?: number[][];
  topLeft?: number[];
  bottomRight?: number[];
};

type DetectionState = {
  lastWasRisk: boolean;
  cleanStreak: number;
  awayStreak: number;
  absentStreak: number;
  blockStreak: number;
  deviceStreak: number;
  multiFaceStreak: number;
};

export function createDetectionState(): DetectionState {
  return {
    lastWasRisk: false,
    cleanStreak: 0,
    awayStreak: 0,
    absentStreak: 0,
    blockStreak: 0,
    deviceStreak: 0,
    multiFaceStreak: 0,
  };
}

function faceProbability(face: FaceLike): number | undefined {
  const prRaw = face.probability;
  if (Array.isArray(prRaw)) return prRaw[0];
  if (typeof prRaw === "number") return prRaw;
  return undefined;
}

function faceBox(face: FaceLike): [number, number, number, number] | null {
  if (face.topLeft && face.bottomRight) {
    return [face.topLeft[0], face.topLeft[1], face.bottomRight[0], face.bottomRight[1]];
  }
  const lm = face.landmarks;
  if (!lm || lm.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of lm) {
    minX = Math.min(minX, pt[0]);
    minY = Math.min(minY, pt[1]);
    maxX = Math.max(maxX, pt[0]);
    maxY = Math.max(maxY, pt[1]);
  }
  if (!isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

function boxArea(box: [number, number, number, number]): number {
  return Math.max(0, box[2] - box[0]) * Math.max(0, box[3] - box[1]);
}

function boxIoU(a: [number, number, number, number], b: [number, number, number, number]): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter <= 0) return 0;
  const union = boxArea(a) + boxArea(b) - inter;
  return union > 0 ? inter / union : 0;
}

/** Remove overlapping BlazeFace duplicates (mirrors/reflections often produce a second box). */
function dedupeFaces(faces: FaceLike[]): FaceLike[] {
  const ranked = [...faces].sort(
    (a, b) => (faceProbability(b) ?? 0) - (faceProbability(a) ?? 0),
  );
  const kept: FaceLike[] = [];
  for (const face of ranked) {
    const box = faceBox(face);
    if (!box) continue;
    const overlaps = kept.some((other) => {
      const otherBox = faceBox(other);
      return otherBox ? boxIoU(box, otherBox) >= FACE_DEDUPE_IOU : false;
    });
    if (!overlaps) kept.push(face);
  }
  return kept;
}

/** Count faces that are distinct, confident, and large enough to be a real second person. */
function countDistinctFaces(faces: FaceLike[]): number {
  const deduped = dedupeFaces(faces);
  if (deduped.length <= 1) return deduped.length;

  const scored = deduped
    .map((face) => {
      const box = faceBox(face);
      const prob = faceProbability(face) ?? 0;
      return { face, box, prob, area: box ? boxArea(box) : 0 };
    })
    .filter((f) => f.box && f.prob >= FACE_PROB);

  if (scored.length <= 1) return scored.length;

  scored.sort((a, b) => b.area - a.area);
  const primaryArea = scored[0].area;
  const significant = scored.filter((f, idx) => {
    if (idx === 0) return true;
    if (f.area < primaryArea * MULTI_FACE_MIN_AREA_RATIO) return false;
    return f.prob >= MULTI_FACE_PROB;
  });

  return significant.length;
}

function analyzeBrightness(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): BrightnessStats | null {
  try {
    canvas.width = 64;
    canvas.height = 48;
    ctx.drawImage(video, 0, 0, 64, 48);
    const data = ctx.getImageData(0, 0, 64, 48).data;
    const n = data.length / 4;
    let sum = 0;
    let dark = 0;
    const lums = new Float32Array(n);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      lums[j] = l;
      sum += l;
      if (l < DARK_PIXEL) dark++;
    }
    const mean = sum / n;
    let vs = 0;
    for (let k = 0; k < n; k++) {
      const diff = lums[k] - mean;
      vs += diff * diff;
    }
    return { mean, std: Math.sqrt(vs / n), darkPct: dark / n };
  } catch {
    return null;
  }
}

function isLookingAway(face: { landmarks?: number[][] }): boolean {
  const lm = face.landmarks;
  if (!lm || lm.length < 4) return false;
  const rightEye = lm[0];
  const leftEye = lm[1];
  const nose = lm[2];
  const eyeMidX = (rightEye[0] + leftEye[0]) / 2;
  const interEye = Math.abs(leftEye[0] - rightEye[0]);
  if (interEye < 8) return true;
  const noseOffset = (nose[0] - eyeMidX) / interEye;
  return Math.abs(noseOffset) > FACE_AWAY_RATIO;
}

function buildTiles(vw: number, vh: number): Array<[number, number, number, number]> {
  const tiles: Array<[number, number, number, number]> = [];
  const ox = Math.floor(vw * 0.08);
  const colW = Math.floor(vw / 3);
  const topH = Math.floor(vh * 0.65);
  const botY = Math.floor(vh * 0.38);
  const botH = vh - botY;
  for (let c = 0; c < 3; c++) {
    const sx = Math.max(0, c * colW - ox);
    const sw = Math.min(vw - sx, colW + 2 * ox);
    tiles.push([sx, 0, sw, topH]);
    tiles.push([sx, botY, sw, botH]);
  }
  return tiles;
}

async function detectRegion(
  cocoModel: CocoModel,
  video: HTMLVideoElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  tileCanvas: HTMLCanvasElement,
  tileCtx: CanvasRenderingContext2D,
): Promise<Array<{ class: string; score: number; bbox: number[] }>> {
  if (sw < 16 || sh < 16) return [];
  const scale = Math.min(2, Math.max(1, 480 / Math.min(sw, sh)));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  tileCanvas.width = dw;
  tileCanvas.height = dh;
  tileCtx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
  try {
    return await cocoModel.detect(tileCanvas, 20);
  } catch {
    return [];
  }
}

function primaryEventType(reasons: string[]): DetectionResult["eventType"] {
  if (reasons.some((r) => r.includes("Recording device"))) return "phone_detected";
  if (reasons.some((r) => r.includes("blocked or covered"))) return "camera_blocked";
  if (reasons.some((r) => r.includes("different person"))) return "identity_mismatch";
  if (reasons.some((r) => r.includes("Liveness check failed"))) return "liveness_failed";
  if (reasons.some((r) => r.includes("More than one"))) return "multiple_faces";
  if (reasons.some((r) => r.includes("No face") || r.includes("No authorized"))) return "no_face";
  if (reasons.some((r) => r.includes("Gaze away"))) return "gaze_away";
  if (reasons.some((r) => r.includes("face the screen"))) return "looking_away";
  return null;
}

export type AdvancedDetectContext = {
  identityBaseline?: IdentityBaseline | null;
  livenessState?: LivenessState;
};

export { createLivenessState };
export type { LivenessState, IdentityBaseline };

export async function detectFrame(
  video: HTMLVideoElement,
  cocoModel: CocoModel | null,
  faceModel: BlazeFaceModel | null,
  config: DetectionConfig,
  state: DetectionState,
  briCanvas: HTMLCanvasElement,
  briCtx: CanvasRenderingContext2D,
  tileCanvas: HTMLCanvasElement,
  tileCtx: CanvasRenderingContext2D,
  advanced?: AdvancedDetectContext,
): Promise<DetectionResult | "clear" | null> {
  if (!video || video.readyState < 2) return null;

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;

  if (config.cameraBlocked) {
    const bri = analyzeBrightness(video, briCanvas, briCtx);
    const looksBlocked =
      !!bri &&
      ((bri.mean < DARK_MEAN && bri.darkPct >= DARK_PCT && bri.std < DARK_STD) ||
        bri.std < UNIFORM_STD);
    if (looksBlocked) state.blockStreak++;
    else state.blockStreak = 0;

    if (state.blockStreak >= BLOCK_STREAK) {
      state.cleanStreak = 0;
      state.lastWasRisk = true;
      state.absentStreak = 0;
      state.awayStreak = 0;
      state.multiFaceStreak = 0;
      const reasons = ["Camera is blocked or covered"];
      return {
        reasons,
        hardViolation: true,
        blocked: true,
        device: false,
        eventType: "camera_blocked",
      };
    }
  }

  let device: { class: string; score: number } | null = null;
  let deviceCandidate: { class: string; score: number } | null = null;
  let persons = 0;

  if (cocoModel && config.phoneDetection) {
    try {
      const regions = [await cocoModel.detect(video, 20)];
      if (config.tiled) {
        const tiles = buildTiles(vw, vh);
        for (const tile of tiles) {
          regions.push(await detectRegion(cocoModel, video, tile[0], tile[1], tile[2], tile[3], tileCanvas, tileCtx));
        }
      }
      for (let r = 0; r < regions.length; r++) {
        const preds = regions[r] || [];
        for (const p of preds) {
          if (r === 0 && p.class === "person" && p.score >= PERSON_SCORE) persons++;
          else if (DEVICE_CLASSES[p.class] && p.score >= config.deviceScore) {
            if (p.class === "remote" && p.score < REMOTE_SCORE_MIN) continue;
            if (!deviceCandidate || p.score > deviceCandidate.score) {
              deviceCandidate = { class: p.class, score: p.score };
            }
          }
        }
      }
    } catch {
      /* ignore frame */
    }
  }

  if (deviceCandidate) {
    if (deviceCandidate.score >= DEVICE_SCORE_IMMEDIATE) state.deviceStreak = DEVICE_STREAK;
    else state.deviceStreak++;
  } else {
    state.deviceStreak = 0;
  }
  if (state.deviceStreak >= DEVICE_STREAK) device = deviceCandidate;

  let faceCount: number | null = null;
  let distinctFaceCount = 0;
  let lookingAway = false;
  let primaryFace: FaceLike | null = null;
  const needsFaceModel =
    faceModel &&
    (config.facePresence ||
      config.multipleFaces ||
      config.lookingAway ||
      config.identityCheck ||
      config.livenessCheck ||
      config.meshGaze);

  if (needsFaceModel) {
    try {
      const rawFaces = (await faceModel!.estimateFaces(video, false)) as FaceLike[];
      const faces = (rawFaces || []).filter((f) => {
        const pr = faceProbability(f);
        return pr === undefined || pr >= FACE_PROB;
      });
      faceCount = faces.length;
      distinctFaceCount = countDistinctFaces(faces);
      if (distinctFaceCount === 1) {
        primaryFace = dedupeFaces(faces)[0] ?? null;
        if (primaryFace) lookingAway = isLookingAway(primaryFace);
      }
    } catch {
      faceCount = null;
      distinctFaceCount = 0;
      primaryFace = null;
    }
  }

  const reasons: string[] = [];
  if (device) {
    reasons.push(
      `Recording device in view (${device.class} ${Math.round(device.score * 100)}%)`,
    );
  }

  const present = faceCount !== null ? (distinctFaceCount > 0 ? distinctFaceCount : faceCount) : persons;

  if (config.facePresence) {
    if (present === 0) state.absentStreak++;
    else state.absentStreak = 0;
    if (state.absentStreak >= ABSENT_STREAK) {
      reasons.push(
        faceCount !== null ? "No face visible to the camera" : "No authorized user visible",
      );
    }
  }

  // Multiple-face checks use BlazeFace only (never COCO person count — too many false positives).
  if (config.multipleFaces && faceCount !== null) {
    if (distinctFaceCount > 1) state.multiFaceStreak++;
    else state.multiFaceStreak = 0;
    if (state.multiFaceStreak >= MULTI_FACE_STREAK) {
      reasons.push("More than one face detected");
    }
  } else {
    state.multiFaceStreak = 0;
  }

  if (config.lookingAway) {
    if (distinctFaceCount === 1 && lookingAway) state.awayStreak++;
    else state.awayStreak = 0;
    if (state.awayStreak >= AWAY_STREAK) reasons.push("Please face the screen");
  }

  const faceVisible = distinctFaceCount === 1 || (faceCount !== null && faceCount > 0);
  const livenessState = advanced?.livenessState;
  const identityBaseline = advanced?.identityBaseline;

  if (livenessState && primaryFace?.landmarks) {
    updateBlinkFromFace(livenessState, primaryFace);

    if (config.meshGaze) {
      if (isGazeAwayFromLandmarks(primaryFace.landmarks)) livenessState.meshGazeStreak++;
      else livenessState.meshGazeStreak = 0;
      if (livenessState.meshGazeStreak >= MESH_GAZE_STREAK) {
        reasons.push("Gaze away from screen (head pose)");
      }
    }

    if (config.identityCheck && identityBaseline) {
      const currentVector = extractIdentityVectorFromFace(primaryFace);
      if (currentVector) {
        const similarity = compareIdentity(identityBaseline, currentVector);
        if (similarity < IDENTITY_SIMILARITY_MIN) livenessState.identityMismatchStreak++;
        else livenessState.identityMismatchStreak = 0;
        if (livenessState.identityMismatchStreak >= IDENTITY_MISMATCH_STREAK) {
          reasons.push("Face does not match enrolled identity — possible different person");
        }
      }
    }

    if (config.livenessCheck && checkLivenessTimeout(livenessState, true)) {
      livenessState.livenessStreak++;
      if (livenessState.livenessStreak >= LIVENESS_STREAK) {
        reasons.push("Liveness check failed — no natural blink detected");
      }
    } else if (config.livenessCheck) {
      livenessState.livenessStreak = 0;
    }
  } else if (livenessState && config.livenessCheck) {
    checkLivenessTimeout(livenessState, faceVisible);
  }

  if (reasons.length > 0) {
    state.cleanStreak = 0;
    state.lastWasRisk = true;
    const eventType = primaryEventType(reasons);
    const hard =
      !!device ||
      state.blockStreak >= BLOCK_STREAK ||
      eventType === "identity_mismatch" ||
      eventType === "liveness_failed";
    return {
      reasons,
      hardViolation: hard,
      blocked: false,
      device: !!device,
      eventType,
      confidence: device?.score,
    };
  }

  if (state.lastWasRisk) {
    state.cleanStreak++;
    if (state.cleanStreak >= CLEAR_STREAK) {
      state.lastWasRisk = false;
      state.blockStreak = 0;
      state.deviceStreak = 0;
      state.multiFaceStreak = 0;
      return "clear";
    }
  }

  return null;
}

const MODEL_LOAD_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} timed out after ${ms / 1000}s. The browser must reach storage.googleapis.com to download AI weights. Check firewall, proxy, or Content-Security-Policy on this site.`,
          ),
        ),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Prefer WebGL; fall back to CPU when GPU/WebGL is unavailable (common on VMs, RDP, some servers). */
async function initTensorFlowBackend(tf: typeof import("@tensorflow/tfjs")): Promise<string> {
  await import("@tensorflow/tfjs-backend-webgl");
  await import("@tensorflow/tfjs-backend-cpu");

  for (const backend of ["webgl", "cpu"] as const) {
    try {
      await tf.setBackend(backend);
      await tf.ready();
      const probe = tf.tensor([1, 2, 3]);
      probe.dispose();
      return backend;
    } catch {
      /* try next backend */
    }
  }
  throw new Error(
    "Could not initialize TensorFlow (WebGL or CPU). Try Chrome/Edge, enable hardware acceleration, or use a machine with GPU support.",
  );
}

export async function loadProctoringModels(): Promise<{
  cocoModel: CocoModel | null;
  faceModel: BlazeFaceModel | null;
  backend: string;
}> {
  console.info("[proctor] initializing TensorFlow.js…");
  const tf = await import("@tensorflow/tfjs");
  const backend = await initTensorFlowBackend(tf);
  console.info("[proctor] TF backend:", backend);

  console.info("[proctor] loading model packages (webpack chunks)…");
  const [cocoSsd, blazeface] = await Promise.all([
    import("@tensorflow-models/coco-ssd"),
    import("@tensorflow-models/blazeface"),
  ]);

  console.info("[proctor] downloading model weights (storage.googleapis.com)…");
  const [cocoModel, faceModel] = await Promise.all([
    withTimeout(cocoSsd.load({ base: "lite_mobilenet_v2" }), MODEL_LOAD_TIMEOUT_MS, "COCO-SSD model"),
    withTimeout(blazeface.load(), MODEL_LOAD_TIMEOUT_MS, "BlazeFace model"),
  ]);
  console.info("[proctor] models ready");

  return {
    cocoModel,
    faceModel: faceModel as BlazeFaceModel,
    backend,
  };
}

export async function warmUpModels(
  video: HTMLVideoElement,
  cocoModel: CocoModel | null,
  faceModel: BlazeFaceModel | null,
  tileCanvas: HTMLCanvasElement,
  tileCtx: CanvasRenderingContext2D,
): Promise<void> {
  tileCanvas.width = 320;
  tileCanvas.height = 240;
  tileCtx.drawImage(video, 0, 0, 320, 240);
  for (let w = 0; w < 2; w++) {
    if (cocoModel) await cocoModel.detect(tileCanvas, 20);
    if (faceModel) await faceModel.estimateFaces(tileCanvas, false);
  }
}
