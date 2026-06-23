"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDetectionState,
  createLivenessState,
  detectFrame,
  loadProctoringModels,
  warmUpModels,
  type IdentityBaseline,
  type LivenessState,
} from "@/lib/proctoring/detectors";
import { runFaceEnrollment } from "@/lib/proctoring/enrollment";
import { buildSyncPayload, computeIntegrityScore } from "@/lib/proctoring/scoring";
import {
  captureVideoFrame,
  syncProctoringEvents,
  uploadProctoringSnapshot,
} from "@/lib/proctoring/sync";
import { DEFAULT_DETECTION_CONFIG, MONITORING_GRACE_PERIOD_MS, SOFT_STRIKE_COOLDOWN_MS, STRIKE_LIMITS, TERMINATABLE_VIOLATIONS } from "@/lib/proctoring/thresholds";
import type {
  BlazeFaceModel,
  CocoModel,
  ProctorEvent,
  ProctorEventType,
  ProctorStatus,
  ProctorViolationLevel,
  VideoProctoringSnapshot,
} from "@/lib/proctoring/types";

type UseVideoProctoringOptions = {
  enabled?: boolean;
  active: boolean;
  interviewId?: string;
  onTerminate?: (reasons: string[]) => void;
  onViolationLevelChange?: (level: ProctorViolationLevel) => void;
};

const EMPTY_STRIKES = (): Record<ProctorEventType, number> => ({
  phone_detected: 0,
  camera_blocked: 0,
  no_face: 0,
  multiple_faces: 0,
  looking_away: 0,
  gaze_away: 0,
  identity_mismatch: 0,
  liveness_failed: 0,
  fullscreen_exit: 0,
  cross_signal: 0,
  clear: 0,
});

const INITIAL_SNAPSHOT: VideoProctoringSnapshot = {
  status: "PENDING",
  ready: false,
  cameraActive: false,
  modelsLoaded: false,
  enrolled: false,
  enrolling: false,
  monitoring: false,
  violationLevel: "none",
  strikes: EMPTY_STRIKES(),
  totalEvents: 0,
  lastReasons: [],
  note: "Click Enable camera, then allow permission when the browser prompts you.",
};

function nowIso() {
  return new Date().toISOString();
}

const SOFT_VIOLATION_TYPES = new Set<ProctorEventType>(["gaze_away", "looking_away", "no_face"]);

function strikeLevel(
  eventType: ProctorEventType,
  strikes: number,
): ProctorViolationLevel {
  const limits = STRIKE_LIMITS[eventType];
  if (!limits) return strikes > 0 ? "warning" : "none";
  const terminatable = TERMINATABLE_VIOLATIONS.has(eventType);
  if (terminatable && strikes >= limits.terminate) return "paused";
  if (strikes >= limits.pause) return "warning";
  if (strikes >= 1) return "warning";
  return "none";
}

export function useVideoProctoring({
  enabled = true,
  active,
  interviewId,
  onTerminate,
  onViolationLevelChange,
}: UseVideoProctoringOptions) {
  const [snapshot, setSnapshot] = useState<VideoProctoringSnapshot>(INITIAL_SNAPSHOT);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cocoModelRef = useRef<CocoModel | null>(null);
  const faceModelRef = useRef<BlazeFaceModel | null>(null);
  const identityBaselineRef = useRef<IdentityBaseline | null>(null);
  const livenessStateRef = useRef<LivenessState>(createLivenessState());
  const detectionStateRef = useRef(createDetectionState());
  const briCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const terminatedRef = useRef(false);
  const eventsRef = useRef<ProctorEvent[]>([]);
  const strikesRef = useRef(EMPTY_STRIKES());
  const violationLevelRef = useRef<ProctorViolationLevel>("none");
  const lastReasonsRef = useRef<string[]>([]);
  const activeViolationsRef = useRef<Set<ProctorEventType>>(new Set());
  const onTerminateRef = useRef(onTerminate);
  const onViolationLevelChangeRef = useRef(onViolationLevelChange);
  const interviewIdRef = useRef(interviewId);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotAtRef = useRef<Record<string, number>>({});
  const lastSoftStrikeAtRef = useRef<Partial<Record<ProctorEventType, number>>>({});
  const monitoringStartedAtRef = useRef<number | null>(null);
  const requestInFlightRef = useRef(false);

  const CAMERA_REQUEST_TIMEOUT_MS = 45_000;

  useEffect(() => {
    interviewIdRef.current = interviewId;
  }, [interviewId]);

  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const flushSync = useCallback(async () => {
    const id = interviewIdRef.current;
    if (!id || eventsRef.current.length === 0) return;
    const snap = {
      ...snapshotRef.current,
      strikes: { ...strikesRef.current },
      lastReasons: [...lastReasonsRef.current],
      totalEvents: eventsRef.current.length,
      integrityScore: computeIntegrityScore(eventsRef.current),
    };
    await syncProctoringEvents(id, buildSyncPayload(snap, eventsRef.current));
  }, []);

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      void flushSync();
    }, 2000);
  }, [flushSync]);

  const maybeCaptureSnapshot = useCallback(
    async (type: ProctorEventType, severity: "hard" | "soft") => {
      const id = interviewIdRef.current;
      const video = videoRef.current;
      if (!id || !video || severity !== "hard") return;
      if (type === "looking_away" || type === "gaze_away" || type === "clear" || type === "no_face") return;

      const now = Date.now();
      const last = lastSnapshotAtRef.current[type] ?? 0;
      if (now - last < 30_000) return;
      lastSnapshotAtRef.current[type] = now;

      const blob = await captureVideoFrame(video);
      if (blob) void uploadProctoringSnapshot(id, blob, type);
    },
    [],
  );

  useEffect(() => {
    onTerminateRef.current = onTerminate;
  }, [onTerminate]);

  useEffect(() => {
    onViolationLevelChangeRef.current = onViolationLevelChange;
  }, [onViolationLevelChange]);

  const updateSnapshot = useCallback((patch: Partial<VideoProctoringSnapshot>) => {
    setSnapshot((prev) => ({ ...prev, ...patch }));
  }, []);

  const setViolationLevel = useCallback(
    (level: ProctorViolationLevel) => {
      if (violationLevelRef.current === level) return;
      violationLevelRef.current = level;
      onViolationLevelChangeRef.current?.(level);
      const status: ProctorStatus =
        level === "paused" ? "PAUSED" : level === "warning" ? "WARNING" : active ? "MONITORING" : "PENDING";
      updateSnapshot({ violationLevel: level, status });
      setShowViolationModal(level !== "none");
    },
    [active, updateSnapshot],
  );

  const recordEvent = useCallback(
    (type: ProctorEventType, reasons: string[], severity: "hard" | "soft", confidence?: number) => {
      lastReasonsRef.current = reasons;

      const isNewEpisode = !activeViolationsRef.current.has(type);
      let countStrike = false;
      if (isNewEpisode) {
        activeViolationsRef.current.add(type);

        countStrike = true;
        if (SOFT_VIOLATION_TYPES.has(type)) {
          const lastStrikeAt = lastSoftStrikeAtRef.current[type] ?? 0;
          if (Date.now() - lastStrikeAt < SOFT_STRIKE_COOLDOWN_MS) {
            countStrike = false;
          } else {
            lastSoftStrikeAtRef.current[type] = Date.now();
          }
        }

        if (countStrike) {
          const event: ProctorEvent = {
            at: nowIso(),
            type,
            severity,
            reasons,
            confidence,
          };
          eventsRef.current = [...eventsRef.current.slice(-49), event];
          strikesRef.current = {
            ...strikesRef.current,
            [type]: (strikesRef.current[type] || 0) + 1,
          };
        }
      }

      const strikes = strikesRef.current[type] || 0;
      const limits = STRIKE_LIMITS[type];
      const level = strikeLevel(type, strikes);
      const integrityScore = computeIntegrityScore(eventsRef.current);
      setViolationLevel(level);

      updateSnapshot({
        strikes: { ...strikesRef.current },
        totalEvents: eventsRef.current.length,
        lastReasons: reasons,
        note: reasons.join("; "),
        monitoring: true,
        integrityScore,
      });

      if (isNewEpisode && countStrike) {
        scheduleSync();
        void maybeCaptureSnapshot(type, severity);
      }

      const monitoringAgeMs =
        monitoringStartedAtRef.current != null ? Date.now() - monitoringStartedAtRef.current : 0;
      const pastGracePeriod = monitoringAgeMs >= MONITORING_GRACE_PERIOD_MS;
      const mayTerminate =
        TERMINATABLE_VIOLATIONS.has(type) &&
        limits &&
        strikes >= limits.terminate &&
        !terminatedRef.current &&
        pastGracePeriod;

      if (mayTerminate) {
        terminatedRef.current = true;
        updateSnapshot({ status: "FAILED", violationLevel: "paused", integrityScore });
        void flushSync();
        onTerminateRef.current?.(reasons);
      }
    },
    [flushSync, maybeCaptureSnapshot, scheduleSync, setViolationLevel, updateSnapshot],
  );

  const reportExternalEvent = useCallback(
    (type: ProctorEventType, reasons: string[], severity: "hard" | "soft" = "hard") => {
      if (terminatedRef.current || !active) return;
      recordEvent(type, reasons, severity);
    },
    [active, recordEvent],
  );

  const handleClear = useCallback(() => {
    activeViolationsRef.current.clear();
    lastReasonsRef.current = [];
    setViolationLevel("none");
    updateSnapshot({
      lastReasons: [],
      note: active ? "Monitoring active — stay in frame and remove any devices" : snapshot.note,
      status: active ? "MONITORING" : snapshot.status,
    });
  }, [active, setViolationLevel, snapshot.note, snapshot.status, updateSnapshot]);

  const releaseCamera = useCallback(() => {
    runningRef.current = false;
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    updateSnapshot({
      cameraActive: false,
      modelsLoaded: false,
      ready: false,
      enrolled: false,
      enrolling: false,
    });
  }, [updateSnapshot]);

  const performEnrollment = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current;
    const faceModel = faceModelRef.current;
    if (!video || !faceModel) return false;

    updateSnapshot({ enrolling: true, note: "Enrolling your face — look at the camera and blink naturally…" });
    setLoadingMessage("Enrolling face…");

    const baseline = await runFaceEnrollment(video, faceModel);
    identityBaselineRef.current = baseline;
    livenessStateRef.current = createLivenessState();

    setLoadingMessage(null);
    if (!baseline) {
      updateSnapshot({
        enrolling: false,
        enrolled: false,
        ready: false,
        cameraActive: true,
        modelsLoaded: true,
        note: "Face enrollment failed — center your face, improve lighting, remove hat/mask, then click Retry face enrollment.",
      });
      return false;
    }

    updateSnapshot({
      enrolling: false,
      enrolled: true,
      ready: true,
      cameraActive: true,
      modelsLoaded: true,
      note: "Face enrolled — start the interview when you are ready",
    });
    return true;
  }, [updateSnapshot]);

  const runDetectionLoop = useCallback(async () => {
    if (!runningRef.current || terminatedRef.current) return;
    const video = videoRef.current;
    const cocoModel = cocoModelRef.current;
    const faceModel = faceModelRef.current;
    if (!video || (!cocoModel && !faceModel)) {
      loopTimerRef.current = setTimeout(() => void runDetectionLoop(), DEFAULT_DETECTION_CONFIG.detectIntervalMs);
      return;
    }

    if (!briCanvasRef.current) briCanvasRef.current = document.createElement("canvas");
    if (!tileCanvasRef.current) tileCanvasRef.current = document.createElement("canvas");
    const briCtx = briCanvasRef.current.getContext("2d", { willReadFrequently: true });
    const tileCtx = tileCanvasRef.current.getContext("2d");
    if (!briCtx || !tileCtx) {
      loopTimerRef.current = setTimeout(() => void runDetectionLoop(), DEFAULT_DETECTION_CONFIG.detectIntervalMs);
      return;
    }

    try {
      const result = await detectFrame(
        video,
        cocoModel,
        faceModel,
        DEFAULT_DETECTION_CONFIG,
        detectionStateRef.current,
        briCanvasRef.current,
        briCtx,
        tileCanvasRef.current,
        tileCtx,
        {
          identityBaseline: identityBaselineRef.current,
          livenessState: livenessStateRef.current,
        },
      );

      if (result === "clear") {
        handleClear();
      } else if (result && result.eventType) {
        recordEvent(
          result.eventType,
          result.reasons,
          result.hardViolation ? "hard" : "soft",
          result.confidence,
        );
      }
    } catch {
      /* ignore single-frame errors */
    }

    loopTimerRef.current = setTimeout(() => void runDetectionLoop(), DEFAULT_DETECTION_CONFIG.detectIntervalMs);
  }, [handleClear, recordEvent]);

  const attachStreamToVideo = useCallback(async (): Promise<boolean> => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream?.active || !video) return false;

    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Video preview timed out")), 15_000);
      const done = () => {
        clearTimeout(timeout);
        resolve();
      };
      if (video.readyState >= 2) return done();
      video.onloadeddata = () => done();
    });
    await video.play().catch(() => undefined);
    return true;
  }, []);

  const resetCameraSetup = useCallback(() => {
    requestInFlightRef.current = false;
    setLoadingMessage(null);
    setCameraError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    updateSnapshot({
      status: "PENDING",
      ready: false,
      enrolled: false,
      enrolling: false,
      cameraActive: false,
      modelsLoaded: false,
      note: "Click Enable camera, then allow permission when the browser prompts you.",
    });
  }, [updateSnapshot]);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (!enabled || typeof window === "undefined") return false;
    // User clicked again — always allow a new attempt (fixes stuck inFlight / disabled button).
    requestInFlightRef.current = false;

    if (streamRef.current?.active && snapshot.enrolled) return true;

    if (!window.isSecureContext) {
      const msg =
        "Camera requires HTTPS (or localhost). Open the interview over https://, not plain http://.";
      setCameraError(msg);
      updateSnapshot({ status: "NOT_AVAILABLE", note: msg, cameraActive: false, modelsLoaded: false });
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Camera API is not available in this browser. Use Chrome, Edge, or Firefox.";
      setCameraError(msg);
      updateSnapshot({ status: "NOT_AVAILABLE", note: msg });
      return false;
    }

    requestInFlightRef.current = true;
    setCameraError(null);
    setLoadingMessage("Requesting camera access…");
    updateSnapshot({
      status: "PENDING",
      note: "Allow camera in the browser prompt (address bar or popup).",
      enrolled: false,
      enrolling: false,
      ready: false,
      cameraActive: false,
      modelsLoaded: false,
    });

    try {
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        }),
        new Promise<MediaStream>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Camera permission timed out. Click the camera icon in the address bar, choose Allow, then click Enable camera again.",
                ),
              ),
            CAMERA_REQUEST_TIMEOUT_MS,
          ),
        ),
      ]);
      streamRef.current = stream;

      let attached = await attachStreamToVideo();
      if (!attached) {
        for (let i = 0; i < 40 && !attached; i++) {
          await new Promise((r) => setTimeout(r, 100));
          attached = await attachStreamToVideo();
        }
      }
      if (!attached) {
        throw new Error("Could not attach camera preview. Refresh the page and try again.");
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "Error";
      const msg =
        err instanceof Error && err.message && name === "Error"
          ? err.message
          : name === "NotAllowedError"
            ? "Camera access was denied. Allow camera permission to start the proctored interview."
            : name === "NotFoundError"
              ? "No camera found. Connect a webcam to continue."
              : "Could not access camera. Check browser permissions and try again.";
      setCameraError(msg);
      updateSnapshot({
        status: "NOT_AVAILABLE",
        ready: false,
        enrolled: false,
        cameraActive: false,
        modelsLoaded: false,
        note: msg,
      });
      setLoadingMessage(null);
      requestInFlightRef.current = false;
      return false;
    }

    updateSnapshot({ cameraActive: true, note: "Camera on — loading detection models…" });
    setLoadingMessage("Loading AI models…");
    try {
      const { cocoModel, faceModel, backend } = await loadProctoringModels();
      cocoModelRef.current = cocoModel;
      faceModelRef.current = faceModel;

      if (videoRef.current && tileCanvasRef.current) {
        const tileCtx = tileCanvasRef.current.getContext("2d");
        if (tileCtx) {
          setLoadingMessage(`Warming up models (${backend})…`);
          await warmUpModels(videoRef.current, cocoModel, faceModel, tileCanvasRef.current, tileCtx);
        }
      }

      updateSnapshot({
        modelsLoaded: true,
        note: `Models loaded (${backend}) — enrolling your face…`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load proctoring models";
      console.error("[proctor] model load failed:", err);
      setCameraError(msg);
      updateSnapshot({
        status: "PENDING",
        ready: false,
        enrolled: false,
        cameraActive: true,
        modelsLoaded: false,
        note: `${msg} Camera stays on — fix network/CSP or click Cancel and retry.`,
      });
      setLoadingMessage(null);
      requestInFlightRef.current = false;
      return false;
    }

    try {
      const enrolled = await performEnrollment();
      return enrolled;
    } finally {
      setLoadingMessage(null);
      requestInFlightRef.current = false;
    }
  }, [
    enabled,
    releaseCamera,
    performEnrollment,
    snapshot.enrolled,
    updateSnapshot,
    attachStreamToVideo,
  ]);

  useEffect(() => {
    if (!enabled || !active || !snapshot.ready || !snapshot.enrolled || terminatedRef.current) {
      runningRef.current = false;
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      if (!active && snapshot.ready) {
        monitoringStartedAtRef.current = null;
        updateSnapshot({
          monitoring: false,
          status: "PENDING",
          note: "Face enrolled — start the interview when you are ready",
        });
      }
      return;
    }

    if (monitoringStartedAtRef.current == null) {
      monitoringStartedAtRef.current = Date.now();
    }
    runningRef.current = true;
    updateSnapshot({
      monitoring: true,
      status: "MONITORING",
      note: "Monitoring active — stay in frame and remove any devices",
    });
    void runDetectionLoop();

    return () => {
      runningRef.current = false;
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };
  }, [active, enabled, runDetectionLoop, snapshot.enrolled, snapshot.ready, updateSnapshot]);

  // Cleanup only on unmount — do NOT depend on flushSync/releaseCamera/snapshot or camera stops after every state update.
  const releaseCameraRef = useRef(releaseCamera);
  releaseCameraRef.current = releaseCamera;
  const flushSyncRef = useRef(flushSync);
  flushSyncRef.current = flushSync;

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      void flushSyncRef.current();
      releaseCameraRef.current();
    };
  }, []);

  useEffect(() => {
    if (!active || !interviewId || !snapshot.ready) return;
    const interval = setInterval(() => void flushSync(), 15_000);
    return () => clearInterval(interval);
  }, [active, interviewId, flushSync, snapshot.ready]);

  const dismissWarning = useCallback(() => {
    if (violationLevelRef.current === "warning") {
      setShowViolationModal(false);
    }
  }, []);

  const getVideoTrack = useCallback((): MediaStreamTrack | null => {
    const tracks = streamRef.current?.getVideoTracks();
    return tracks && tracks.length > 0 ? tracks[0] : null;
  }, []);

  const getSnapshotForTranscript = useCallback((): VideoProctoringSnapshot => {
    const events = eventsRef.current;
    return {
      ...snapshot,
      strikes: { ...strikesRef.current },
      lastReasons: [...lastReasonsRef.current],
      totalEvents: events.length,
      integrityScore: computeIntegrityScore(events),
    };
  }, [snapshot]);

  return {
    videoRef,
    snapshot,
    cameraError,
    loadingMessage,
    showViolationModal,
    requestCamera,
    resetCameraSetup,
    releaseCamera,
    dismissWarning,
    getSnapshotForTranscript,
    getVideoTrack,
    reportExternalEvent,
    retryEnrollment: performEnrollment,
    events: eventsRef.current,
  };
}

export type UseVideoProctoringReturn = ReturnType<typeof useVideoProctoring>;
