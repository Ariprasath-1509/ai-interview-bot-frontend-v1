"use client";

import { Loader2, ShieldAlert, Video, VideoOff } from "lucide-react";
import type { UseVideoProctoringReturn } from "@/hooks/useVideoProctoring";
import type { ProctorViolationLevel } from "@/lib/proctoring/types";

type Props = {
  proctoring: UseVideoProctoringReturn;
  canStart: boolean;
  sessionActive: boolean;
  onRequestCamera: () => void;
  onRetryEnrollment?: () => void;
};

function statusColor(status: string): string {
  switch (status) {
    case "MONITORING":
      return "bg-emerald-500";
    case "WARNING":
      return "bg-amber-500";
    case "PAUSED":
    case "FAILED":
      return "bg-red-500";
    default:
      return "bg-zinc-400";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "MONITORING":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "WARNING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "PAUSED":
    case "FAILED":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

function levelLabel(level: ProctorViolationLevel): string {
  if (level === "paused") return "Interview paused";
  if (level === "warning") return "Proctoring warning";
  return "Monitoring";
}

export function VideoProctorPanel({ proctoring, canStart, sessionActive, onRequestCamera, onRetryEnrollment }: Props) {
  const {
    videoRef,
    snapshot,
    cameraError,
    loadingMessage,
    showViolationModal,
    dismissWarning,
  } = proctoring;

  return (
    <>
      {/* Compact setup bar — stays in the interview card */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Video proctoring</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(snapshot.status)}`}>
              {snapshot.status.replace(/_/g, " ")}
            </span>
          </div>
          {!snapshot.ready && (
            <button
              type="button"
              onClick={onRequestCamera}
              disabled={!!loadingMessage}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60"
            >
              {loadingMessage ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {loadingMessage}
                </>
              ) : (
                <>
                  <Video className="h-3.5 w-3.5" />
                  Enable camera
                </>
              )}
            </button>
          )}
        </div>

        {!loadingMessage && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{snapshot.note}</p>
        )}
        {loadingMessage && (
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">{loadingMessage}</p>
        )}

        {cameraError && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <VideoOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {!canStart && !sessionActive && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {!snapshot.cameraActive
              ? "Enable camera and allow browser permission."
              : !snapshot.modelsLoaded
                ? "Wait for AI models to finish loading (first visit may take 1–2 minutes)."
                : !snapshot.enrolled
                  ? "Complete face enrollment before starting the interview."
                  : "Finish proctoring setup before starting the interview."}
          </p>
        )}

        {snapshot.enrolling && (
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
            Enrolling your face — look at the camera, stay still, and blink naturally.
          </p>
        )}

        {snapshot.cameraActive && snapshot.modelsLoaded && !snapshot.enrolled && !snapshot.enrolling && (
          <button
            type="button"
            onClick={onRetryEnrollment ?? onRequestCamera}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          >
            Retry face enrollment
          </button>
        )}

        {snapshot.lastReasons.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-red-700 dark:text-red-300">
            {snapshot.lastReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating PiP — fixed bottom-left, stays visible while scrolling */}
      <div
        className="fixed bottom-5 left-5 z-[45] w-[11.5rem] overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-900 shadow-2xl ring-1 ring-black/10 dark:border-zinc-700"
        aria-label="Proctoring camera preview"
      >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-700/80 bg-zinc-950/90 px-2.5 py-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor(snapshot.status)}`} />
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-200">
                {snapshot.monitoring ? "Live" : "Camera"}
              </span>
            </div>
            {snapshot.monitoring && (
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                REC
              </span>
            )}
          </div>

          <div className="relative aspect-[4/3] w-full bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {!snapshot.cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/90 text-zinc-300">
                {loadingMessage ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="px-2 text-center text-[10px]">{loadingMessage}</span>
                  </>
                ) : (
                  <span className="px-2 text-center text-[10px]">Click Enable camera above</span>
                )}
              </div>
            )}
            {snapshot.cameraActive && !snapshot.ready && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/70 text-zinc-200">
                {loadingMessage || snapshot.enrolling ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="px-2 text-center text-[10px]">
                      {loadingMessage ?? "Enrolling face…"}
                    </span>
                  </>
                ) : snapshot.modelsLoaded ? (
                  <span className="px-2 text-center text-[10px] text-amber-200">Enrollment needed</span>
                ) : (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="px-2 text-center text-[10px]">Loading models…</span>
                  </>
                )}
              </div>
            )}
            {snapshot.violationLevel !== "none" && (
              <div className="absolute inset-x-0 bottom-0 bg-red-600/85 px-2 py-1 text-center text-[9px] font-semibold text-white">
                {snapshot.violationLevel === "paused" ? "Paused" : "Warning"}
              </div>
            )}
          </div>
        </div>

      {showViolationModal && snapshot.violationLevel !== "none" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border-2 border-red-500 bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                {levelLabel(snapshot.violationLevel)}
              </h2>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">Proctoring violation detected</p>
              <ul className="list-disc space-y-1 pl-4 text-zinc-600 dark:text-zinc-400">
                {snapshot.lastReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {snapshot.violationLevel === "paused" ? (
                <p className="text-red-700 dark:text-red-300">
                  Resolve the issue immediately. Repeated violations will terminate the interview.
                </p>
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">
                  Remove any phones or recording devices, stay in frame, and face the screen. Further violations will
                  pause or end the interview.
                </p>
              )}
            </div>

            {snapshot.violationLevel === "warning" && (
              <button
                type="button"
                onClick={dismissWarning}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                I understand — continue interview
              </button>
            )}

            {snapshot.violationLevel === "paused" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                Interview paused until the flagged condition is resolved.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
