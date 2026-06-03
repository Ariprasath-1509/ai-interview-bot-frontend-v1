import type { ProctorEvent, ProctorEventType } from "./types";

export async function syncProctoringEvents(
  interviewId: string,
  payload: {
    events: ProctorEvent[];
    strikes: Record<string, number>;
    status: string;
    integrityScore: number;
    summary: Record<string, unknown>;
  },
): Promise<boolean> {
  const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/proctoring/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  return !!res?.ok;
}

export async function uploadProctoringSnapshot(
  interviewId: string,
  blob: Blob,
  eventType: ProctorEventType,
): Promise<boolean> {
  const fd = new FormData();
  fd.append("snapshot", blob, `proctor-${eventType}.jpg`);
  fd.append("eventType", eventType);
  const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/proctoring/snapshot`, {
    method: "POST",
    body: fd,
  }).catch(() => null);
  return !!res?.ok;
}

export function captureVideoFrame(video: HTMLVideoElement, quality = 0.75): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!video.videoWidth || !video.videoHeight) {
      resolve(null);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth, 640);
    canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}
