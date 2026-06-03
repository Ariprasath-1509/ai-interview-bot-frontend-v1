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
import { DEFAULT_DETECTION_CONFIG, STRIKE_LIMITS } from "@/lib/proctoring/thresholds";
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
  enrolled: false,
  enrolling: false,
  monitoring: false,
  violationLevel: "none",
  strikes: EMPTY_STRIKES(),
  totalEvents: 0,
  lastReasons: [],
  note: "Camera permission required for proctored interview",
};

function nowIso() {
  return new Date().toISOString();
}

function strikeLevel(
  eventType: ProctorEventType,
  strikes: number,
): ProctorViolationLevel {
  const limits = STRIKE_LIMITS[eventType];
  if (!limits) return strikes > 0 ? "warning" : "none";
  if (strikes >= limits.terminate) return "paused";
  if (strikes >= limits.pause) return "paused";
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

  useEffect(() => {
    interviewIdRef.current = interviewId;
  }, [interviewId]);

  const flushSync = useCallback(async () => {
    const id = interviewIdRef.current;
    if (!id || eventsRef.current.length === 0) return;
    const snap = {
      ...snapshot,
      strikes: { ...strikesRef.current },
      lastReasons: [...lastReasonsRef.current],
      totalEvents: eventsRef.current.length,
      integrityScore: computeIntegrityScore(eventsRef.current),
    };
    await syncProctoringEvents(id, buildSyncPayload(snap, eventsRef.current));
  }, [snapshot]);

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
      if (isNewEpisode) {
        activeViolationsRef.current.add(type);
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

      if (isNewEpisode) {
        scheduleSync();
        void maybeCaptureSnapshot(type, severity);
      }

      if (limits && strikes >= limits.terminate && !terminatedRef.current) {
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
  }, []);

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
        note: "Face enrollment failed — ensure your face is centered and well lit, then retry.",
      });
      return false;
    }

    updateSnapshot({
      enrolling: false,
      enrolled: true,
      ready: true,
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

  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (!enabled || typeof window === "undefined") return false;
    if (streamRef.current?.active && snapshot.enrolled) return true;

    setCameraError(null);
    setLoadingMessage("Requesting camera access…");
    updateSnapshot({ status: "PENDING", note: "Requesting camera access…", enrolled: false, enrolling: false });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          const v = videoRef.current!;
          if (v.readyState >= 2) return resolve();
          v.onloadeddata = () => resolve();
        });
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "Error";
      const msg =
        name === "NotAllowedError"
          ? "Camera access was denied. Allow camera permission to start the proctored interview."
          : name === "NotFoundError"
            ? "No camera found. Connect a webcam to continue."
            : "Could not access camera. Check browser permissions and try again.";
      setCameraError(msg);
      updateSnapshot({ status: "NOT_AVAILABLE", ready: false, enrolled: false, note: msg });
      setLoadingMessage(null);
      return false;
    }

    setLoadingMessage("Loading AI models…");
    updateSnapshot({ note: "Loading detection models…" });
    try {
      const { cocoModel, faceModel } = await loadProctoringModels();
      cocoModelRef.current = cocoModel;
      faceModelRef.current = faceModel;

      if (videoRef.current && tileCanvasRef.current) {
        const tileCtx = tileCanvasRef.current.getContext("2d");
        if (tileCtx) {
          setLoadingMessage("Warming up models…");
          await warmUpModels(videoRef.current, cocoModel, faceModel, tileCanvasRef.current, tileCtx);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load proctoring models";
      setCameraError(msg);
      updateSnapshot({ status: "NOT_AVAILABLE", ready: false, enrolled: false, note: msg });
      setLoadingMessage(null);
      releaseCamera();
      return false;
    }

    const enrolled = await performEnrollment();
    return enrolled;
  }, [enabled, releaseCamera, performEnrollment, snapshot.enrolled, updateSnapshot]);

  useEffect(() => {
    if (!enabled || !active || !snapshot.ready || !snapshot.enrolled || terminatedRef.current) {
      runningRef.current = false;
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      if (!active && snapshot.ready) {
        updateSnapshot({
          monitoring: false,
          status: "PENDING",
          note: "Face enrolled — start the interview when you are ready",
        });
      }
      return;
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

  useEffect(
    () => () => {
      releaseCamera();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      void flushSync();
    },
    [flushSync, releaseCamera],
  );

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
