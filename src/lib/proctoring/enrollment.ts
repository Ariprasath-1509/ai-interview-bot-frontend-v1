import type { BlazeFaceModel } from "./types";

export type IdentityBaseline = {
  vector: Float32Array;
};

type BlazeFaceLike = {
  landmarks?: number[][];
  topLeft?: number[];
  bottomRight?: number[];
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function extractIdentityVectorFromFace(face: BlazeFaceLike): Float32Array | null {
  const lm = face.landmarks;
  if (!lm || lm.length < 4) return null;

  const rightEye = lm[0];
  const leftEye = lm[1];
  const nose = lm[2];
  if (!rightEye || !leftEye || !nose) return null;

  const eyeMidX = (rightEye[0] + leftEye[0]) / 2;
  const eyeMidY = (rightEye[1] + leftEye[1]) / 2;
  const interEye = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
  if (interEye < 12) return null;

  const out = new Float32Array(lm.length * 2);
  let idx = 0;
  for (const pt of lm) {
    if (!pt || pt.length < 2) return null;
    out[idx++] = (pt[0] - eyeMidX) / interEye;
    out[idx++] = (pt[1] - eyeMidY) / interEye;
  }
  return out;
}

function averageVectors(vectors: Float32Array[]): IdentityBaseline | null {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const sum = new Float32Array(dim);
  for (const v of vectors) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  const avg = new Float32Array(dim);
  for (let i = 0; i < dim; i++) avg[i] = sum[i] / vectors.length;
  return { vector: avg };
}

export function compareIdentity(baseline: IdentityBaseline, current: Float32Array): number {
  const a = baseline.vector;
  if (current.length !== a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * current[i];
    na += a[i] * a[i];
    nb += current[i] * current[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

export async function runFaceEnrollment(
  video: HTMLVideoElement,
  faceModel: BlazeFaceModel,
  frameCount = 20,
  intervalMs = 300,
): Promise<IdentityBaseline | null> {
  const samples: Float32Array[] = [];
  const minSamples = 4;

  for (let i = 0; i < frameCount; i++) {
    if (video.readyState >= 2) {
      try {
        const faces = await faceModel.estimateFaces(video, false);
        if (faces.length === 1) {
          const vector = extractIdentityVectorFromFace(faces[0]);
          if (vector) samples.push(vector);
        }
      } catch {
        /* skip frame */
      }
    }
    if (i < frameCount - 1) await sleep(intervalMs);
  }

  if (samples.length < minSamples) return null;
  return averageVectors(samples);
}
