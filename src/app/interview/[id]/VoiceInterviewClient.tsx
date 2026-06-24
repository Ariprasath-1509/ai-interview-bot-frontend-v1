"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { VideoProctorPanel } from "@/components/proctoring/VideoProctorPanel";
import { useFullscreenEnforcement } from "@/hooks/useFullscreenEnforcement";
import { useVideoProctoring } from "@/hooks/useVideoProctoring";
import { CODING_SLOT_MINUTES } from "@/lib/constants";
import {
  fetchWithTimeout,
  isUsingBrowserVoiceFallback,
  MediaServiceTimeoutError,
  MEDIA_SERVICE_TIMEOUT_MS,
  TTS_TIMEOUT_MS,
  resetVoiceServicePrefs,
  voiceServicePrefs,
} from "@/lib/mediaTimeout";
import type { ProctoringMode } from "@/lib/proctoring/mode";
import type { QuestionMeta } from "./codingTypes";

const SPEECH_TIMEOUT_MS = 10000; // 10 seconds of silence before considering speech done

const WHISPER_LANGUAGES = [
  { id: "auto", label: "Auto-detect" },
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "ta", label: "Tamil" },
  { id: "te", label: "Telugu" },
  { id: "kn", label: "Kannada" },
  { id: "ml", label: "Malayalam" },
  { id: "mr", label: "Marathi" },
  { id: "bn", label: "Bengali" },
  { id: "gu", label: "Gujarati" },
  { id: "pa", label: "Punjabi" },
  { id: "ur", label: "Urdu" },
];

type Utterance = { speaker: "BOT" | "CANDIDATE"; text: string; at: string };

type Props = {
  jdTitle: string;
  interviewId: string;
  rubricJson: string | null;
  candidateProfileJson: string | null;
  durationMinutes: number;
  interviewMode: string;
  proctoringMode: ProctoringMode;
  candidateSource?: string | null;
  onTranscriptChange: (json: string) => void;
  onVoiceValidationChange?: (snapshot: VoiceValidationSnapshot) => void;
  onTimeExpired?: () => void;
  onRegisterSubmitAnswer?: (fn: (answer: string) => void) => void;
  onRegisterEnsureRecording?: (fn: () => Promise<void>) => void;
  onRegisterFinalizeSession?: (fn: () => void) => void;
  onSessionRecordingChange?: (state: { recording: boolean; uploaded: boolean; uploading: boolean }) => void;
  isCodingSlotActive?: boolean;
  codingSlotSatisfied?: boolean;
  codeSubmissionJson?: string;
  onCodingTimerChange?: (state: { active: boolean; secondsLeft: number; expired: boolean }) => void;
  onQuestionChange?: (question: string) => void;
  onQuestionMetaChange?: (meta: QuestionMeta) => void;
};

type MicPhase = "idle" | "listening" | "bot_speaking";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

type VoiceValidationStatus = "PENDING_ENROLLMENT" | "VERIFIED" | "RISK" | "FAILED" | "NOT_VERIFIED";

type VoiceValidationSnapshot = {
  status: VoiceValidationStatus;
  enrolled: boolean;
  checks: number;
  flaggedChecks: number;
  consecutiveMismatches: number;
  averageSimilarity: number | null;
  lastSimilarity: number | null;
  startSimilarity: number | null;
  endSimilarity: number | null;
  note: string;
};

function nowIso() {
  return new Date().toISOString();
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm === 0) return v.map(() => 0);
  return v.map((x) => x / norm);
}

let activeTtsAudio: HTMLAudioElement | null = null;

function cancelActiveTts() {
  if (activeTtsAudio) {
    activeTtsAudio.pause();
    activeTtsAudio = null;
  }
  if (typeof window !== "undefined") {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }
}

async function speakWhenDone(text: string, onStart?: () => void): Promise<void> {
  if (typeof window === "undefined") return;

  cancelActiveTts();
  let started = false;
  const notifyStart = () => {
    if (started) return;
    started = true;
    onStart?.();
  };

  // Try Kokoro TTS (server) first — much more natural voice than browser speech
  if (voiceServicePrefs.preferServerTts && text.trim().length > 0) {
    try {
      const res = await fetchWithTimeout(
        "/api/ai/tts",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.trim() }) },
        TTS_TIMEOUT_MS,
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeTtsAudio = audio;
        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) { resolved = true; URL.revokeObjectURL(url); activeTtsAudio = null; resolve(); }
          };
          const timer = setTimeout(done, Math.max(text.length * 100, 6000));
          audio.onplay = () => notifyStart();
          audio.onended = () => { clearTimeout(timer); done(); };
          audio.onerror = () => { clearTimeout(timer); done(); };
          audio.play().then(() => notifyStart()).catch(() => { clearTimeout(timer); done(); });
        });
        return;
      }
    } catch {
      // Server TTS unavailable this session — fall back to browser speech
      voiceServicePrefs.preferServerTts = false;
    }
  }

  // Browser speech fallback
  const synth = window.speechSynthesis;
  if (!synth) {
    notifyStart();
    return;
  }

  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };
    const timer = setTimeout(done, Math.max(text.length * 80, 4000) + 5000);
    u.onstart = () => notifyStart();
    u.onend = () => { clearTimeout(timer); done(); };
    u.onerror = () => { clearTimeout(timer); done(); };
    try {
      synth.speak(u);
      notifyStart();
    } catch {
      clearTimeout(timer);
      done();
    }
  });
}

/** User asked to end (spoken); do not treat as a technical answer. */
function isEndInterviewIntent(text: string): boolean {
  const t = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length === 0) return false;
  const patterns = [
    /\bstop (the )?interview\b/,
    /\bend (the )?interview\b/,
    /\bstop (this )?session\b/,
    /\bend (this )?session\b/,
    /\bno more questions\b/,
    /\b(i'?m|i am) done\b/,
    /\bwe'?re done\b/,
    /\bthat'?s all\b/,
    /\blet'?s stop\b/,
    /\bplease stop\b/,
    /\bwant to stop\b/,
    /\bwould like to stop\b/,
    /\bwrap( it)? up\b/,
    /\bterminate (the )?interview\b/,
    /\bcan we stop\b/,
    /\bneed to stop\b/,
  ];
  return patterns.some((re) => re.test(t));
}

export function VoiceInterviewClient({
  jdTitle,
  interviewId,
  rubricJson,
  candidateProfileJson,
  durationMinutes,
  interviewMode,
  proctoringMode,
  candidateSource = null,
  onTranscriptChange,
  onVoiceValidationChange,
  onTimeExpired,
  onRegisterSubmitAnswer,
  onRegisterEnsureRecording,
  onRegisterFinalizeSession,
  onSessionRecordingChange,
  isCodingSlotActive = false,
  codingSlotSatisfied = true,
  codeSubmissionJson = "",
  onCodingTimerChange,
  onQuestionChange,
  onQuestionMetaChange,
}: Props) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const hasMic = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (hasMic) setSupported(true);
    const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    (rec as unknown as { maxAlternatives?: number }).maxAlternatives = 3;
    recognitionRef.current = rec;
  }, []);
  const [micPhase, setMicPhase] = useState<MicPhase>("idle");
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [botPromptIdx, setBotPromptIdx] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [typedDraft, setTypedDraft] = useState("");
  /** Mirrored for UI; logic also uses typedOnlyRef inside callbacks. */
  const [typedAnswersOnly, setTypedAnswersOnly] = useState(false);

  const [timerStarted, setTimerStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [codingSecondsLeft, setCodingSecondsLeft] = useState(CODING_SLOT_MINUTES * 60);
  const [codingTimerActive, setCodingTimerActive] = useState(false);
  const [mainTimerPaused, setMainTimerPaused] = useState(false);
  const [codingTimeExpired, setCodingTimeExpired] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [manipulationCount, setManipulationCount] = useState(0);

  // Tab switch detection state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const tabSwitchCountRef = useRef(0);

  // Server Whisper STT (primary for voice answers)
  const [whisperLang, setWhisperLang] = useState("auto");
  const [answerRecording, setAnswerRecording] = useState(false);
  const [whisperProcessing, setWhisperProcessing] = useState(false);
  const [fetchingNextQuestion, setFetchingNextQuestion] = useState(false);
  const [usingBrowserVoice, setUsingBrowserVoice] = useState(false);
  const [whisperError, setWhisperError] = useState<string | null>(null);
  const [livePreviewText, setLivePreviewText] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const answerMediaRef = useRef<MediaRecorder | null>(null);
  const answerChunksRef = useRef<Blob[]>([]);
  const answerRecordingStartTimeRef = useRef<number>(0);
  const serverVoiceModeRef = useRef(true);
  const previewRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const previewBufferRef = useRef("");
  const previewActiveRef = useRef(false);

  // Session recording state
  const [sessionRecording, setSessionRecording] = useState(false);
  const [sessionRecordingUploaded, setSessionRecordingUploaded] = useState(false);
  const [sessionRecordingUploading, setSessionRecordingUploading] = useState(false);
  const sessionRecorderRef = useRef<MediaRecorder | null>(null);
  const sessionChunksRef = useRef<Blob[]>([]);
  const sessionChunkIndexRef = useRef(0);
  const sessionChunkedUploadRef = useRef(false);
  const manipulationCountRef = useRef(0);
  const micPhaseRef = useRef<MicPhase>("idle");
  const [proctorSessionActive, setProctorSessionActive] = useState(false);
  const proctorPausedRef = useRef(false);
  const onProctorTerminateRef = useRef<(reasons: string[]) => void>(() => {});

  const videoProctoringRequired = proctoringMode === "video";
  const videoProctoringRequiredRef = useRef(videoProctoringRequired);
  useEffect(() => {
    videoProctoringRequiredRef.current = videoProctoringRequired;
  }, [videoProctoringRequired]);

  const proctoring = useVideoProctoring({
    enabled: videoProctoringRequired,
    active: proctorSessionActive && !timeExpired && !abandoning,
    interviewId,
    onTerminate: (reasons) => onProctorTerminateRef.current(reasons),
    onViolationLevelChange: (level) => {
      proctorPausedRef.current = level === "paused";
    },
  });
  const integrityCanStart = videoProctoringRequired
    ? proctoring.snapshot.ready && proctoring.snapshot.enrolled
    : true;
  const getProctorVideoTrackRef = useRef(proctoring.getVideoTrack);
  getProctorVideoTrackRef.current = proctoring.getVideoTrack;
  const getSnapshotForTranscriptRef = useRef(proctoring.getSnapshotForTranscript);
  getSnapshotForTranscriptRef.current = proctoring.getSnapshotForTranscript;
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  onTranscriptChangeRef.current = onTranscriptChange;
  const lastEmittedTranscriptRef = useRef("");
  const crossSignalReportedRef = useRef(false);

  const fullscreen = useFullscreenEnforcement({
    active: proctorSessionActive && !timeExpired && !abandoning,
    onExit: (count) => {
      if (videoProctoringRequired) {
        proctoring.reportExternalEvent(
          "fullscreen_exit",
          [`Exited fullscreen mode (${count} time${count === 1 ? "" : "s"})`],
          count >= 2 ? "hard" : "soft",
        );
      }
    },
  });

  // Camera must be started via user click (Enable camera) — auto getUserMedia on mount is blocked or hangs in many browsers.

  useEffect(() => {
    if (!isCodingSlotActive || !proctorSessionActive) return;
    const blockClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    return () => {
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
    };
  }, [isCodingSlotActive, proctorSessionActive]);

  const [voiceValidation, setVoiceValidation] = useState<VoiceValidationSnapshot>({
    status: "PENDING_ENROLLMENT",
    enrolled: false,
    checks: 0,
    flaggedChecks: 0,
    consecutiveMismatches: 0,
    averageSimilarity: null,
    lastSimilarity: null,
    startSimilarity: null,
    endSimilarity: null,
    note: "Collecting initial voice sample",
  });
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasCodingPendingRef = useRef(false);
  const mainTimerPausedRef = useRef(false);

  useEffect(() => {
    if (!videoProctoringRequired || !proctorSessionActive || crossSignalReportedRef.current) return;
    const noFace =
      proctoring.snapshot.lastReasons.some((r) => r.includes("No face") || r.includes("No authorized")) ||
      (proctoring.snapshot.strikes.no_face ?? 0) > 0;
    if (voiceValidation.status === "FAILED" && noFace) {
      crossSignalReportedRef.current = true;
      proctoring.reportExternalEvent(
        "cross_signal",
        ["Voice identity failed while face was absent — possible impersonation or proxy"],
        "hard",
      );
    }
  }, [
    videoProctoringRequired,
    proctorSessionActive,
    proctoring,
    voiceValidation.status,
    proctoring.snapshot.lastReasons,
    proctoring.snapshot.strikes.no_face,
  ]);

  useEffect(() => { micPhaseRef.current = micPhase; }, [micPhase]);
  useEffect(() => { manipulationCountRef.current = manipulationCount; }, [manipulationCount]);

  const codingPending = isCodingSlotActive && !codingSlotSatisfied;

  useEffect(() => {
    const hasBotQuestion = utterances.some((u) => u.speaker === "BOT");
    if (hasBotQuestion && !timerStarted) setTimerStarted(true);
  }, [utterances, timerStarted]);

  useEffect(() => {
    if (codingPending && !wasCodingPendingRef.current) {
      setCodingSecondsLeft(CODING_SLOT_MINUTES * 60);
      setCodingTimerActive(true);
      setCodingTimeExpired(false);
      mainTimerPausedRef.current = true;
      setMainTimerPaused(true);
    } else if (!codingPending && wasCodingPendingRef.current) {
      setCodingTimerActive(false);
      setCodingTimeExpired(false);
      mainTimerPausedRef.current = false;
      setMainTimerPaused(false);
    }
    wasCodingPendingRef.current = codingPending;
  }, [codingPending]);

  useEffect(() => {
    onCodingTimerChange?.({
      active: codingTimerActive,
      secondsLeft: codingSecondsLeft,
      expired: codingTimeExpired,
    });
  }, [codingTimerActive, codingSecondsLeft, codingTimeExpired, onCodingTimerChange]);

  useEffect(() => {
    if (!timerStarted) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      if (codingPending) {
        setCodingSecondsLeft((prev) => {
          if (prev <= 1) {
            setCodingTimerActive(false);
            setCodingTimeExpired(true);
            mainTimerPausedRef.current = false;
            setMainTimerPaused(false);
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      if (mainTimerPausedRef.current) return;
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    };
  }, [timerStarted, codingPending]);

  useEffect(() => () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  useEffect(() => {
    if (!showConfirm) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowConfirm(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showConfirm]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  async function abandonInterview(
    currentUtterances: { speaker: string; text: string; at: string }[],
    reason:
      | "not_prepared"
      | "time_expired"
      | "ai_manipulation"
      | "tab_switch_violation"
      | "proctoring_violation"
  ) {
    if (abandoning) return;
    setAbandoning(true);

    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    releaseMicStream();
    finalizeVoiceValidation();

    // Add termination message to transcript based on reason
    let terminationMessage = "";
    if (reason === "tab_switch_violation") {
      terminationMessage = "[INTERVIEW TERMINATED] Candidate switched tabs/windows more than 2 times during the interview. This is considered a violation of interview integrity guidelines.";
    } else if (reason === "ai_manipulation") {
      terminationMessage = "[INTERVIEW TERMINATED] Multiple attempts to manipulate the AI interviewer were detected.";
    } else if (reason === "not_prepared") {
      terminationMessage = "[INTERVIEW ENDED] Candidate indicated they were not prepared and chose to end the interview early.";
    } else if (reason === "time_expired") {
      terminationMessage = "[INTERVIEW ENDED] Time limit expired.";
    } else if (reason === "proctoring_violation") {
      terminationMessage =
        "[INTERVIEW TERMINATED] Video proctoring detected repeated serious integrity violations (phone/recording device, camera obstruction, multiple people, or identity mismatch).";
    }

    const finalUtterances = terminationMessage
      ? [...currentUtterances, { speaker: "BOT" as const, text: terminationMessage, at: nowIso() }]
      : currentUtterances;

    const transcriptJson = JSON.stringify({ utterances: finalUtterances });
    const hasSubstantiveContent =
      finalUtterances.filter((u) => u.speaker === "CANDIDATE").length > 0 ||
      finalUtterances.some((u) => u.text.includes("[Code submission"));
    try {
      await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/abandon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptJson, reason }),
      });
      if (hasSubstantiveContent) {
        void fetch(`/api/interviews/${encodeURIComponent(interviewId)}/assess-partial`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            transcriptJson,
            codeSubmissionJson: codeSubmissionJson || undefined,
          }),
        });
      }
    } catch {
      // best effort
    }
    void stopSessionRecordingAndUpload();
    setProctorSessionActive(false);
    window.location.href = "/candidate/dashboard";
  }

  useEffect(() => {
    onProctorTerminateRef.current = () => {
      if (!videoProctoringRequired) return;
      void abandonInterview(utterancesRef.current, "proctoring_violation");
    };
  });

  useEffect(() => {
    if (!timeExpired) return;
    onTimeExpired?.();
    const timeUpMessage: Utterance = {
      speaker: "BOT",
      text: `Your ${durationMinutes} minutes are up — we're stopping the interview here. Thank you for your time, your responses have been recorded.`,
      at: nowIso(),
    };
    const finalUtterances = [...utterancesRef.current, timeUpMessage];
    
    // Update utterances to include the time-up message
    syncUtterances(finalUtterances);
    
    // Stop the session but don't abandon - let user complete normally
    finalizeVoiceSession();

    // Show time expired message and allow user to mark complete
    void speakWhenDone(timeUpMessage.text);
    // Auto-upload session recording if active
    void stopSessionRecordingAndUpload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeExpired, durationMinutes]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const utterancesRef = useRef<Utterance[]>([]);
  const finalBufferRef = useRef("");
  /** Latest interim phrase (not always finalized by engine when user clicks Send). */
  const interimRef = useRef("");
  const botPromptIdxRef = useRef(0);
  /** User wants an active interview session (Start … until Stop). */
  const sessionActiveRef = useRef(false);
  /** Recognition was stopped only so the bot can speak (do not flush / do not treat as user Stop). */
  const pausedForTtsRef = useRef(false);
  /** User clicked "Send answer" — wait for `onend` so the engine finalizes text before flush. */
  const commitAfterEndRef = useRef(false);
  /** User clicked "Stop session" — must not flush buffer as an answer on `onend`. */
  const explicitStopRef = useRef(false);
  const sessionFinalizedRef = useRef(false);
  /** User chose typed answers only (no Web Speech recognition). */
  const typedOnlyRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeDataRef = useRef<Float32Array | null>(null);
  const freqDataRef = useRef<Float32Array | null>(null);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrollmentFeaturesRef = useRef<number[][]>([]);
  const enrolledSignatureRef = useRef<number[] | null>(null);
  const checksRef = useRef(0);
  const flaggedRef = useRef(0);
  const consecutiveRef = useRef(0);
  const avgSimilarityRef = useRef(0);
  const startSimilarityRef = useRef<number | null>(null);
  const lastSimilarityRef = useRef<number | null>(null);
  const hardFailedRef = useRef(false);
  /** Latest “user left view” cleanup (avoids stale closures in document listeners). */
  const silentEndBecauseUserLeftRef = useRef<() => void>(() => {});

  const updateVoiceValidation = useCallback((patch: Partial<VoiceValidationSnapshot>) => {
    setVoiceValidation((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    onVoiceValidationChange?.(voiceValidation);
  }, [voiceValidation, onVoiceValidationChange]);

  function buildVoiceFeature(): number[] | null {
    const analyser = analyserRef.current;
    const tData = timeDataRef.current;
    const fData = freqDataRef.current;
    if (!analyser || !tData || !fData) return null;

    // @ts-expect-error - getFloatTimeDomainData accepts Float32Array
    analyser.getFloatTimeDomainData(tData);
    let rms = 0;
    for (let i = 0; i < tData.length; i++) rms += tData[i] * tData[i];
    rms = Math.sqrt(rms / tData.length);
    if (rms < 0.01) return null;

    // @ts-expect-error - getFloatFrequencyData accepts Float32Array
    analyser.getFloatFrequencyData(fData);
    const bucketCount = 24;
    const bucketSize = Math.floor(fData.length / bucketCount);
    const feature: number[] = [];
    for (let b = 0; b < bucketCount; b++) {
      const start = b * bucketSize;
      const end = b === bucketCount - 1 ? fData.length : start + bucketSize;
      let sum = 0;
      for (let i = start; i < end; i++) {
        // Convert dB values to positive energy-ish values.
        sum += Math.max(0, 100 + fData[i]);
      }
      feature.push(sum / Math.max(1, end - start));
    }
    feature.push(rms * 100); // keep loudness component
    return normalizeVector(feature);
  }

  function processVoiceFeature(feature: number[]) {
    if (typedOnlyRef.current || micPhaseRef.current === "bot_speaking" || !sessionActiveRef.current) return;

    if (!enrolledSignatureRef.current) {
      enrollmentFeaturesRef.current.push(feature);
      if (enrollmentFeaturesRef.current.length >= 10) {
        const len = feature.length;
        const mean = Array.from({ length: len }, (_, idx) =>
          enrollmentFeaturesRef.current.reduce((s, row) => s + row[idx], 0) / enrollmentFeaturesRef.current.length
        );
        const enrolled = normalizeVector(mean);
        enrolledSignatureRef.current = enrolled;
        const selfSim = cosineSimilarity(enrolled, feature);
        startSimilarityRef.current = selfSim;
        updateVoiceValidation({
          status: "VERIFIED",
          enrolled: true,
          startSimilarity: Number(selfSim.toFixed(3)),
          note: "Voice enrolled. Continuous validation active.",
        });
      } else {
        updateVoiceValidation({
          status: "PENDING_ENROLLMENT",
          note: `Collecting voice sample (${enrollmentFeaturesRef.current.length}/10)`,
        });
      }
      return;
    }

    const sim = cosineSimilarity(enrolledSignatureRef.current, feature);
    lastSimilarityRef.current = sim;
    checksRef.current += 1;
    avgSimilarityRef.current += (sim - avgSimilarityRef.current) / checksRef.current;

    const mismatch = sim < 0.78;
    if (mismatch) {
      flaggedRef.current += 1;
      consecutiveRef.current += 1;
    } else {
      consecutiveRef.current = 0;
    }

    let status: VoiceValidationStatus = "VERIFIED";
    let note = "Voice consistency looks good.";
    if (consecutiveRef.current >= 4 || (checksRef.current >= 12 && flaggedRef.current >= 6)) {
      status = "FAILED";
      hardFailedRef.current = true;
      note = "Voice mismatch detected multiple times. Identity continuity failed.";
    } else if (consecutiveRef.current >= 2 || (checksRef.current >= 8 && flaggedRef.current >= 3)) {
      status = "RISK";
      note = "Some voice mismatch detected. Continue with caution.";
    }

    updateVoiceValidation({
      status,
      enrolled: true,
      checks: checksRef.current,
      flaggedChecks: flaggedRef.current,
      consecutiveMismatches: consecutiveRef.current,
      averageSimilarity: Number(avgSimilarityRef.current.toFixed(3)),
      lastSimilarity: Number(sim.toFixed(3)),
      note,
    });
  }

  function startVoiceMonitor(stream: MediaStream) {
    stopVoiceMonitor();

    if (!stream || !stream.active) {
      console.warn("[Voice] Cannot monitor inactive stream");

      updateVoiceValidation({
        status: "NOT_VERIFIED",
        note: "Microphone stream is not active.",
      });

      return;
    }

    const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

    if (!Ctx) {
      updateVoiceValidation({
        status: "NOT_VERIFIED",
        note: "AudioContext not supported in browser.",
      });

      return;
    }

    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;

    timeDataRef.current = new Float32Array(analyser.fftSize);
    freqDataRef.current = new Float32Array(analyser.frequencyBinCount);

    monitorIntervalRef.current = setInterval(() => {
      const analyser = analyserRef.current;
      const tData = timeDataRef.current;
      if (analyser && tData) {
        // @ts-expect-error - getFloatTimeDomainData accepts Float32Array
        analyser.getFloatTimeDomainData(tData);
        let rms = 0;
        for (let i = 0; i < tData.length; i++) rms += tData[i] * tData[i];
        rms = Math.sqrt(rms / tData.length);
        setMicLevel(Math.min(100, Math.round(rms * 900)));
      }

      const feature = buildVoiceFeature();
      if (!feature) return;

      processVoiceFeature(feature);
    }, 200);
  }
  function stopVoiceMonitor() {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    analyserRef.current = null;
    timeDataRef.current = null;
    freqDataRef.current = null;
    setMicLevel(0);
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
    }
  }

  function speechPreviewLang(): string {
    const map: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      ta: "ta-IN",
      te: "te-IN",
      kn: "kn-IN",
      ml: "ml-IN",
      mr: "mr-IN",
      bn: "bn-IN",
      gu: "gu-IN",
      pa: "pa-IN",
      ur: "ur-PK",
    };
    // en-IN gives Chrome the Indian English acoustic model, which handles
    // Indian accents and technical vocabulary significantly better than en-US.
    return whisperLang === "auto" ? "en-IN" : (map[whisperLang] ?? "en-IN");
  }

  function clearLivePreview() {
    previewBufferRef.current = "";
    setLivePreviewText("");
  }

  function resetAnswerCaptureState() {
    previewBufferRef.current = "";
    finalBufferRef.current = "";
    interimRef.current = "";
    setLivePreviewText("");
    setInterimText("");
  }

  function stopLiveSpeechPreview() {
    previewActiveRef.current = false;
    const rec = previewRecognitionRef.current;
    previewRecognitionRef.current = null;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }

  function startLiveSpeechPreview() {
    if (sessionFinalizedRef.current || typedOnlyRef.current || pausedForTtsRef.current || micPhaseRef.current === "bot_speaking") return;
    // Browser STT mode uses the main recognizer (recognitionRef) for live text, so the
    // separate preview recognizer must NOT run there — two SpeechRecognition instances on
    // the same mic conflict and abort. Preview only runs in server/Whisper mode.
    if (!serverVoiceModeRef.current || !sessionActiveRef.current) return;

    const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
    if (!Ctor) return;

    stopLiveSpeechPreview();

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = speechPreviewLang();

    rec.onresult = (event) => {
      if (pausedForTtsRef.current || micPhaseRef.current === "bot_speaking") return;
      const e = event as {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript?: string } }>;
      };
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res?.[0]?.transcript ?? "";
        if (res?.isFinal) {
          previewBufferRef.current += text.trim() + " ";
        } else {
          interim += text;
        }
      }
      const combined = `${previewBufferRef.current}${interim}`.trim();
      setLivePreviewText(combined);
    };

    rec.onerror = (event) => {
      const err = (event as { error?: string })?.error;
      if (err === "aborted" || err === "no-speech") return;
    };

    rec.onend = () => {
      if (!previewActiveRef.current || sessionFinalizedRef.current || !sessionActiveRef.current || micPhaseRef.current !== "listening") return;
      try {
        rec.start();
      } catch {
        /* ignore */
      }
    };

    previewRecognitionRef.current = rec;
    previewActiveRef.current = true;
    try {
      rec.start();
    } catch {
      previewActiveRef.current = false;
      previewRecognitionRef.current = null;
    }
  }

  function resetVoiceValidationSession() {
    enrollmentFeaturesRef.current = [];
    enrolledSignatureRef.current = null;
    checksRef.current = 0;
    flaggedRef.current = 0;
    consecutiveRef.current = 0;
    avgSimilarityRef.current = 0;
    startSimilarityRef.current = null;
    lastSimilarityRef.current = null;
    hardFailedRef.current = false;
    updateVoiceValidation({
      status: "PENDING_ENROLLMENT",
      enrolled: false,
      checks: 0,
      flaggedChecks: 0,
      consecutiveMismatches: 0,
      averageSimilarity: null,
      lastSimilarity: null,
      startSimilarity: null,
      endSimilarity: null,
      note: "Collecting initial voice sample",
    });
  }

  function finalizeVoiceValidation() {
    if (typedOnlyRef.current) {
      updateVoiceValidation({
        status: "NOT_VERIFIED",
        note: "Typed-only mode used. Voice continuity cannot be guaranteed.",
      });
      return;
    }
    if (!enrolledSignatureRef.current) {
      updateVoiceValidation({
        status: "NOT_VERIFIED",
        note: "Insufficient spoken audio to enroll voice.",
      });
      return;
    }
    const endSimilarity = lastSimilarityRef.current ?? avgSimilarityRef.current ?? null;
    if (endSimilarity != null) {
      const rounded = Number(endSimilarity.toFixed(3));
      if (hardFailedRef.current || endSimilarity < 0.74) {
        updateVoiceValidation({
          status: "FAILED",
          endSimilarity: rounded,
          note: "Start/end voice mismatch detected.",
        });
      } else if (voiceValidation.status === "RISK") {
        updateVoiceValidation({
          endSimilarity: rounded,
          note: "Interview completed with some voice mismatch risk.",
        });
      } else {
        updateVoiceValidation({
          status: "VERIFIED",
          endSimilarity: rounded,
          note: "Start/end voice match verified.",
        });
      }
    }
  }

  async function uploadRecordingChunk(blob: Blob, chunkIndex: number, isFinal: boolean) {
    const fd = new FormData();
    fd.append("chunk", blob, `chunk-${chunkIndex}.webm`);
    fd.append("chunkIndex", String(chunkIndex));
    fd.append("isFinal", String(isFinal));
    const res = await fetch(
      `/api/interviews/${encodeURIComponent(interviewId)}/recording/chunk`,
      { method: "POST", body: fd },
    );
    if (res.ok) sessionChunkedUploadRef.current = true;
    return res.ok;
  }

  async function startSessionRecording() {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const videoTrack = getProctorVideoTrackRef.current()?.clone();
      const tracks = [...audioStream.getAudioTracks(), ...(videoTrack ? [videoTrack] : [])];
      const stream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      sessionChunksRef.current = [];
      sessionChunkIndexRef.current = 0;
      sessionChunkedUploadRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) {
          sessionChunksRef.current.push(e.data);
          const idx = sessionChunkIndexRef.current++;
          void uploadRecordingChunk(e.data, idx, false);
        }
      };
      rec.onstop = () => {
        audioStream.getTracks().forEach((t) => t.stop());
        stream.getVideoTracks().forEach((t) => t.stop());
      };
      sessionRecorderRef.current = rec;
      rec.start(5000);
      setSessionRecording(true);
    } catch {
      // silent — recording is optional
    }
  }

  const stopSessionRecordingAndUpload = useCallback(async () => {
    if (sessionRecordingUploaded || sessionRecordingUploading) return;
    const rec = sessionRecorderRef.current;
    if (!rec || rec.state === "inactive") {
      if (sessionChunksRef.current.length === 0) return;
    }
    setSessionRecordingUploading(true);
    setSessionRecording(false);
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.onstop = () => {
          sessionRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
          resolve();
        };
        rec.stop();
      });
    }
    try {
      if (sessionChunkedUploadRef.current) {
        await uploadRecordingChunk(new Blob([], { type: "video/webm" }), sessionChunkIndexRef.current, true);
        setSessionRecordingUploaded(true);
      } else if (sessionChunksRef.current.length > 0) {
        const blob = new Blob(sessionChunksRef.current, { type: "video/webm" });
        const fd = new FormData();
        fd.append("recording", blob, "session.webm");
        const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/recording`, { method: "POST", body: fd });
        if (res.ok) setSessionRecordingUploaded(true);
      }
    } catch {
      // best effort
    } finally {
      setSessionRecordingUploading(false);
    }
  }, [interviewId, sessionRecordingUploaded, sessionRecordingUploading]);

  const ensureSessionRecordingUploaded = useCallback(async () => {
    if (sessionRecordingUploaded) return;
    if (sessionRecording || sessionChunksRef.current.length > 0) {
      await stopSessionRecordingAndUpload();
    }
    const deadline = Date.now() + 30_000;
    while (sessionRecordingUploading && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }, [sessionRecording, sessionRecordingUploaded, sessionRecordingUploading, stopSessionRecordingAndUpload]);

  useEffect(() => {
    onSessionRecordingChange?.({
      recording: sessionRecording,
      uploaded: sessionRecordingUploaded,
      uploading: sessionRecordingUploading,
    });
  }, [sessionRecording, sessionRecordingUploaded, sessionRecordingUploading, onSessionRecordingChange]);

  useEffect(() => {
    onRegisterEnsureRecording?.(ensureSessionRecordingUploaded);
  }, [onRegisterEnsureRecording, ensureSessionRecordingUploaded]);

  const finalizeVoiceSessionRef = useRef(finalizeVoiceSession);
  finalizeVoiceSessionRef.current = finalizeVoiceSession;

  useEffect(() => {
    onRegisterFinalizeSession?.(() => finalizeVoiceSessionRef.current());
  }, [onRegisterFinalizeSession]);

  useEffect(() => {
    return () => finalizeVoiceSessionRef.current();
  }, []);

  async function transcribeAnswerBlob(blob: Blob): Promise<string> {
    const fd = new FormData();
    fd.append("audio", blob, "answer.webm");
    if (whisperLang !== "auto") fd.append("language", whisperLang);
    const res = await fetchWithTimeout("/api/ai/transcribe", { method: "POST", body: fd }, MEDIA_SERVICE_TIMEOUT_MS);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string; error?: string };
      throw new Error(err.detail ?? err.error ?? "Transcription failed");
    }
    const data = await res.json() as { text?: string };
    return data.text?.trim() ?? "";
  }

  function getBrowserSttPreviewText(): string {
    const preview = previewBufferRef.current.trim() || livePreviewText.trim();
    const recognition = `${finalBufferRef.current}${interimRef.current ? (finalBufferRef.current ? " " : "") + interimRef.current : ""}`.trim();
    return preview || recognition;
  }

  function enableBrowserSttFallback(reason: string) {
    voiceServicePrefs.preferServerStt = false;
    serverVoiceModeRef.current = false;
    setUsingBrowserVoice(true);
    setWhisperError(null);
    console.warn("[STT] Switching to browser speech:", reason);
    resetAnswerCaptureState();
    void stopAnswerRecordingBlob().catch(() => null);
    attachRecognitionHandlers();
    if (sessionActiveRef.current && !sessionFinalizedRef.current) {
      scheduleRecognitionStart("browser stt fallback");
    }
  }

  async function submitVoiceAnswerText(text: string) {
    const clean = text.trim();
    if (!clean) return false;
    resetAnswerCaptureState();
    advancingRef.current = true;
    if (isEndInterviewIntent(clean)) {
      advancingRef.current = false;
      void endInterviewFromVoice(clean);
      return true;
    }
    addCandidate(clean);
    void advanceAfterAnswer(clean);
    return true;
  }

  function startAnswerRecording() {
    if (sessionFinalizedRef.current || !sessionActiveRef.current) return;
    const stream = micStreamRef.current;
    if (!stream || typedOnlyRef.current) return;
    if (answerMediaRef.current?.state === "recording") return;
    try {
      answerChunksRef.current = [];
      answerRecordingStartTimeRef.current = Date.now();
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) answerChunksRef.current.push(e.data);
      };
      answerMediaRef.current = rec;
      rec.start(2000);
      setAnswerRecording(true);
      setWhisperError(null);
      clearLivePreview();
      startLiveSpeechPreview();
    } catch {
      setWhisperError("Could not start answer recording.");
    }
  }

  async function stopAnswerRecordingBlob(): Promise<Blob | null> {
    const rec = answerMediaRef.current;
    if (!rec || rec.state === "inactive") {
      setAnswerRecording(false);
      return answerChunksRef.current.length
        ? new Blob(answerChunksRef.current, { type: "audio/webm" })
        : null;
    }
    setAnswerRecording(false);
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    answerMediaRef.current = null;
    if (answerChunksRef.current.length === 0) return null;
    return new Blob(answerChunksRef.current, { type: "audio/webm" });
  }

  async function sendVoiceAnswer() {
    if (!sessionActiveRef.current || advancingRef.current || typedOnlyRef.current) return;
    if (isCodingSlotActive && !codingSlotSatisfied) {
      setWhisperError("This is a coding question — use Run & Submit in the code editor before sending a voice answer.");
      return;
    }

    if (!voiceServicePrefs.preferServerStt) {
      const answer = interimRef.current.trim() || finalBufferRef.current.trim();
      if (!answer) {
        setWhisperError("No speech detected. Speak your answer, then click Send answer again.");
        if (sessionActiveRef.current) scheduleRecognitionStart("retry browser stt");
        return;
      }
      finalBufferRef.current = answer;
      interimRef.current = "";
      setInterimText("");
      clearLivePreview();
      flushSpokenAnswer();
      return;
    }

    const recordingDuration = Date.now() - answerRecordingStartTimeRef.current;
    if (recordingDuration < 1500) {
      setWhisperError(`Recording too short (${Math.round(recordingDuration / 1000)}s). Speak for at least 2 seconds before clicking Send.`);
      return;
    }

    const browserFallbackText = getBrowserSttPreviewText();
    setWhisperProcessing(true);
    setWhisperError(null);
    stopLiveSpeechPreview();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    const blob = await stopAnswerRecordingBlob();
    if (!blob || blob.size < 2000) {
      if (browserFallbackText && await submitVoiceAnswerText(browserFallbackText)) {
        return;
      }
      setWhisperError(`Recording too small (${blob?.size ?? 0} bytes). Speak louder or longer, then try again.`);
      startAnswerRecording();
      return;
    }
    try {
      const text = await transcribeAnswerBlob(blob);
      if (!text || text.length < 3) {
        if (browserFallbackText && await submitVoiceAnswerText(browserFallbackText)) {
          enableBrowserSttFallback("Whisper returned insufficient text");
          return;
        }
        setWhisperError("Transcription too short. Speak a complete sentence and try again.");
        startAnswerRecording();
        return;
      }
      await submitVoiceAnswerText(text);
    } catch (e) {
      const timedOut = e instanceof MediaServiceTimeoutError;
      const reason = timedOut ? "Whisper timed out (>10s)" : (e instanceof Error ? e.message : "Transcription failed");
      if (browserFallbackText && await submitVoiceAnswerText(browserFallbackText)) {
        enableBrowserSttFallback(reason);
        return;
      }
      enableBrowserSttFallback(reason);
      setWhisperError(
        timedOut
          ? "Whisper timed out. Switched to browser speech — speak and click Send answer again."
          : "Whisper unavailable. Switched to browser speech — speak and click Send answer again.",
      );
    } finally {
      setWhisperProcessing(false);
    }
  }

  useEffect(() => {
    if (micPhase === "listening" && !typedAnswersOnly && serverVoiceModeRef.current && sessionActiveRef.current) {
      startLiveSpeechPreview();
    } else {
      stopLiveSpeechPreview();
    }
    return () => stopLiveSpeechPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micPhase, typedAnswersOnly, whisperLang]);

  useEffect(() => {
    if (!videoProctoringRequired) {
      proctorPausedRef.current = false;
      return;
    }
    const paused = proctoring.snapshot.violationLevel === "paused";
    proctorPausedRef.current = paused;
    if (!proctorSessionActive || timeExpired || abandoning) return;

    if (paused && micPhase === "listening") {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      void stopAnswerRecordingBlob();
      setMicPhase("idle");
    } else if (!paused && micPhase === "idle" && sessionActiveRef.current) {
      if (typedOnlyRef.current) {
        setMicPhase("listening");
      } else if (serverVoiceModeRef.current) {
        setMicPhase("listening");
        startAnswerRecording();
      } else {
        try {
          recognitionRef.current?.start();
          setMicPhase("listening");
        } catch {
          /* ignore */
        }
      }
    }
  }, [videoProctoringRequired, proctoring.snapshot.violationLevel, proctorSessionActive, micPhase, timeExpired, abandoning]);

  async function fetchNextQuestion(args: {
    slot: number;
    lastAnswer: string;
    transcript: Utterance[];
    manipulationCount: number;
  }): Promise<{
    question: string;
    manipulationDetected?: boolean;
    terminateInterview?: boolean;
    interviewComplete?: boolean;
    isCoding?: boolean;
    preferredLanguage?: string;
    starterCode?: string | null;
  } | null> {
    // Cancel any previous in-flight request
    nextQuestionAbortRef.current?.abort();
    const controller = new AbortController();
    nextQuestionAbortRef.current = controller;

    const MAX_RETRIES = 3;
    const BACKOFF_MS = [0, 1000, 2000];
    const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
      if (controller.signal.aborted) return null;
      try {
        const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/next-question`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            slot: args.slot,
            lastAnswer: args.lastAnswer,
            utterances: args.transcript,
            manipulationCount: args.manipulationCount,
            rubricJson: rubricJson ?? undefined,
            candidateProfileJson: candidateProfileJson ?? undefined,
          }),
        });
        if (!res.ok) {
          console.warn(`[fetchNextQuestion] Attempt ${attempt + 1}/${MAX_RETRIES} failed — status ${res.status}`);
          if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES - 1) continue;
          return null;
        }
        const data = (await res.json()) as {
          question?: string;
          manipulationDetected?: boolean;
          terminateInterview?: boolean;
          interviewComplete?: boolean;
          isCoding?: boolean;
          preferredLanguage?: string;
          starterCode?: string | null;
        };
        if (typeof data.question === "string") {
          return {
            question: data.question,
            manipulationDetected: data.manipulationDetected,
            terminateInterview: data.terminateInterview,
            interviewComplete: data.interviewComplete,
            isCoding: data.isCoding,
            preferredLanguage: data.preferredLanguage,
            starterCode: data.starterCode,
          };
        }
        return null;
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return null;
        console.warn(`[fetchNextQuestion] Attempt ${attempt + 1}/${MAX_RETRIES} network error:`, err);
        if (attempt < MAX_RETRIES - 1) continue;
        return null;
      }
    }
    return null;
  }

  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const advancingRef = useRef(false);
  const nextQuestionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = transcriptContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [utterances]);

  useEffect(() => {
    utterancesRef.current = utterances;
  }, [utterances]);

  useEffect(() => {
    botPromptIdxRef.current = botPromptIdx;
  }, [botPromptIdx]);

  // Register the code-submit-as-answer bridge so CodeWorkspace can inject answers into the voice flow
  useEffect(() => {
    onRegisterSubmitAnswer?.((answer: string) => {
      if (!sessionActiveRef.current || advancingRef.current) return;
      addCandidate(answer);
      void advanceAfterAnswer(answer);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterSubmitAnswer]);

  useEffect(() => {
    const transcript = {
      meta: {
        source: "web-speech",
        at: nowIso(),
        proctoringMode,
        candidateSource,
        voiceValidation,
        ...(videoProctoringRequired
          ? { videoProctoring: getSnapshotForTranscriptRef.current() }
          : {}),
        tabSwitchCount: tabSwitchCountRef.current,
        tabSwitchViolation: tabSwitchCountRef.current >= 2,
        fullscreenExitCount: fullscreen.exitCount,
      },
      utterances,
    };
    const json = JSON.stringify(transcript, null, 2);
    if (json === lastEmittedTranscriptRef.current) return;
    lastEmittedTranscriptRef.current = json;
    onTranscriptChangeRef.current(json);
  }, [
    utterances,
    voiceValidation,
    proctoringMode,
    candidateSource,
    videoProctoringRequired,
    fullscreen.exitCount,
    proctoring.snapshot.totalEvents,
    proctoring.snapshot.violationLevel,
    proctoring.snapshot.lastReasons,
  ]);

  function syncUtterances(next: Utterance[]) {
    utterancesRef.current = next;
    setUtterances(next);
  }

  function stopSpeechRecognition(rec: SpeechRecognitionLike | null) {
    if (!rec) return;
    try {
      if (rec.abort) rec.abort();
      else rec.stop();
    } catch {
      /* ignore */
    }
  }

  function finalizeVoiceSession() {
    if (sessionFinalizedRef.current) return;
    sessionFinalizedRef.current = true;

    sessionActiveRef.current = false;
    previewActiveRef.current = false;
    pausedForTtsRef.current = true;
    explicitStopRef.current = false;
    commitAfterEndRef.current = false;
    advancingRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    cancelActiveTts();
    stopLiveSpeechPreview();
    stopSpeechRecognition(previewRecognitionRef.current);
    previewRecognitionRef.current = null;
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;

    void stopAnswerRecordingBlob();

    const sessionRec = sessionRecorderRef.current;
    if (sessionRec && sessionRec.state !== "inactive") {
      try {
        sessionRec.stop();
      } catch {
        /* ignore */
      }
    }
    sessionRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());

    releaseMicStream();
    resetAnswerCaptureState();

    setMicPhase("idle");
    setAnswerRecording(false);
    setProctorSessionActive(false);
    setWhisperProcessing(false);
    setFetchingNextQuestion(false);
    setSessionRecording(false);
  }

  function releaseMicStream() {
    stopLiveSpeechPreview();
    clearLivePreview();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    stopVoiceMonitor();
  }

  function speechErrorMessage(code: string | undefined): string {
    switch (code) {
      case "not-allowed":
        return "Microphone or speech recognition was blocked. Click the lock icon in the address bar, allow microphone (and sound if listed), then try Start again. Use Chrome or Edge on desktop.";
      case "audio-capture":
        return "No microphone was found, or it is in use by another app. Close other apps using the mic and try again.";
      case "service-not-allowed":
        return "Speech recognition is disabled for this page. Try another browser or check enterprise policies.";
      case "network":
        return "Speech recognition hit a network error (Chrome uses a cloud service for Web Speech). Check your connection and try again.";
      default:
        return code ? `Speech recognition error: ${code}` : "Speech recognition failed.";
    }
  }

  async function ensureMicStream(retryCount = 0): Promise<boolean> {
    releaseMicStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechError("This browser does not support getUserMedia. Switching to typed mode automatically...");
      setTimeout(() => void startTypedOnly(), 1500);
      return false;
    }
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      // Don't start voice monitor - voice validation disabled in browser mode
      return true;
    }  catch (e) {
      const err = e as { name?: string; message?: string };
      const msg = err.message ?? String(e);

      if (err.name === "NotReadableError" && retryCount < 2) {
        console.log(`[Mic] Device busy, retry ${retryCount + 1}/2 in ${(retryCount + 1) * 500}ms`);
        await new Promise(r => setTimeout(r, (retryCount + 1) * 500));
        return ensureMicStream(retryCount + 1);
      }

      if (err.name === "NotAllowedError") {
        setSpeechError(
            "Microphone permission denied. Click the lock icon in your browser's address bar, allow microphone access, then click Start again. Or use 'Typed answers only' below."
        );
        return false;
      }

      setSpeechError(
          `Could not open microphone (${msg}). Check browser permissions, unplug/replug USB headsets, and try “Use typed answers instead” below.`,
      );
      return false;
    }
  }

  /** One bot line + TTS without restarting the recognition loop (session already over or pausing). */
  async function playClosingLine(botText: string) {
    const row: Utterance = { speaker: "BOT", text: botText, at: nowIso() };
    syncUtterances([...utterancesRef.current, row]);
    setMicPhase("bot_speaking");
    await speakWhenDone(botText);
    if (isUsingBrowserVoiceFallback()) setUsingBrowserVoice(true);
    setMicPhase("idle");
    finalizeVoiceValidation();
  }

  function emitQuestionMeta(text: string, slot: number, meta?: { isCoding?: boolean; preferredLanguage?: string; starterCode?: string | null }) {
    onQuestionChange?.(text);
    onQuestionMetaChange?.({
      question: text,
      slot,
      isCoding: meta?.isCoding ?? false,
      preferredLanguage: meta?.preferredLanguage ?? "python",
      starterCode: meta?.starterCode ?? null,
    });
  }

  async function addBot(text: string, meta?: { isCoding?: boolean; preferredLanguage?: string; starterCode?: string | null }) {
    void stopAnswerRecordingBlob();
    const rec = recognitionRef.current;
    if (rec && sessionActiveRef.current && !serverVoiceModeRef.current) {
      pausedForTtsRef.current = true;
      finalBufferRef.current = "";
      interimRef.current = "";
      setInterimText("");
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }

    // Show question immediately before TTS starts
    const row: Utterance = { speaker: "BOT", text, at: nowIso() };
    syncUtterances([...utterancesRef.current, row]);
    emitQuestionMeta(text, botPromptIdxRef.current, meta);

    setMicPhase("bot_speaking");

    // Speak the question
    await speakWhenDone(text);
    if (isUsingBrowserVoiceFallback()) setUsingBrowserVoice(true);

    pausedForTtsRef.current = false;
    if (sessionFinalizedRef.current || !sessionActiveRef.current) {
      setMicPhase("idle");
      return;
    }
    setMicPhase("listening");
    if (typedOnlyRef.current) {
      return;
    }
    resetAnswerCaptureState();
    scheduleRecognitionStart("after tts");
  }

  function scheduleRecognitionStart(reason: string) {
    void reason;

    if (sessionFinalizedRef.current || !sessionActiveRef.current) {
      return;
    }

    if (typedOnlyRef.current) {
      if (sessionActiveRef.current) {
        setMicPhase("listening");
      }
      return;
    }

    if (serverVoiceModeRef.current) {
      if (sessionActiveRef.current) {
        setMicPhase("listening");
        resetAnswerCaptureState();
        startAnswerRecording();
      }
      return;
    }

    // Do NOT call resetAnswerCaptureState() here for browser STT mode.
    // Chrome's Web Speech API restarts recognition periodically (e.g. after ~60s or on silence),
    // and we must preserve finalBufferRef across restarts so long answers aren't truncated.
    // The buffer is only cleared when the answer is actually sent (flushSpokenAnswer / addBot).

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }

    const rec = recognitionRef.current;

    if (!rec || !sessionActiveRef.current) {
      return;
    }

    rec.lang = speechPreviewLang();

    const attempt = (delayMs: number) => {
      restartTimerRef.current = setTimeout(() => {

        if (!sessionActiveRef.current || pausedForTtsRef.current) {
          return;
        }

        try {
          rec.start();
          setMicPhase("listening");
        } catch {
          restartTimerRef.current = setTimeout(() => {

            if (!sessionActiveRef.current || pausedForTtsRef.current) {
              return;
            }

            try {
              rec.start();
              setMicPhase("listening");
            } catch {
              setMicPhase("idle");
              sessionActiveRef.current = false;
            }
          }, 350);
        }
      }, delayMs);
    };

    attempt(80);
  }

  function addCandidate(text: string) {
    const row: Utterance = { speaker: "CANDIDATE", text, at: nowIso() };
    syncUtterances([...utterancesRef.current, row]);
  }

  async function advanceAfterAnswer(answer: string) {
    const clean = answer.trim();
    if (!clean) {
      advancingRef.current = false;
      return;
    }

    if (!advancingRef.current) {
      // Called directly (e.g. from submitTypedReply), set the flag now
      advancingRef.current = true;
    }

    try {
    setFetchingNextQuestion(true);
    const nextSlot = botPromptIdxRef.current + 1;
    const nextQ = await fetchNextQuestion({
      slot: nextSlot,
      lastAnswer: clean,
      transcript: utterancesRef.current,
      manipulationCount: manipulationCountRef.current,
    });
    setFetchingNextQuestion(false);

    if (nextQ) {
      if (nextQ.manipulationDetected) {
        setManipulationCount((prev) => prev + 1);
      }
      if (nextQ.terminateInterview) {
        void abandonInterview(utterancesRef.current, "ai_manipulation");
        return;
      }
      if (nextQ.interviewComplete) {
        // Interview has reached its natural end
        sessionActiveRef.current = false;
        typedOnlyRef.current = false;
        setTypedAnswersOnly(false);
        pausedForTtsRef.current = false;
        commitAfterEndRef.current = false;
        explicitStopRef.current = false;
        finalBufferRef.current = "";
        interimRef.current = "";
        setInterimText("");
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        try {
          recognitionRef.current?.stop();
        } catch { /* ignore */ }
        releaseMicStream();
        setMicPhase("idle");
        void stopSessionRecordingAndUpload();

        // Add the completion message
        await playClosingLine(nextQ.question);
        return;
      }
    }

    const q =
      nextQ?.question ??
      "I didn’t quite catch the next prompt from the server—staying on what you just said, could you give me one concrete example and what made it tricky?";

    botPromptIdxRef.current = nextSlot;
    setBotPromptIdx(nextSlot);
    await addBot(q, {
      isCoding: nextQ?.isCoding,
      preferredLanguage: nextQ?.preferredLanguage,
      starterCode: nextQ?.starterCode,
    });
    } finally {
      setFetchingNextQuestion(false);
      advancingRef.current = false;
    }
  }

  async function endInterviewFromVoice(userLine: string) {
    sessionActiveRef.current = false;
    typedOnlyRef.current = false;
    setTypedAnswersOnly(false);
    commitAfterEndRef.current = false;
    explicitStopRef.current = false;
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    cancelActiveTts();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    void stopAnswerRecordingBlob();
    releaseMicStream();
    finalizeVoiceValidation();
    void stopSessionRecordingAndUpload();
    setProctorSessionActive(false);
    addCandidate(userLine);
    await playClosingLine(
      "Got it—we’ll wrap up here. Thanks for letting me know; you can press Mark complete below when you’re ready.",
    );
  }

  function flushSpokenAnswer() {

    if (pausedForTtsRef.current || !sessionActiveRef.current || advancingRef.current) {
      console.log('[Speech] Flush blocked - session inactive, TTS active, or already advancing');
      return;
    }

    const clean = finalBufferRef.current.trim();

    console.log(
        '[Speech] Flushing answer:',
        clean.substring(0, 100) + (clean.length > 100 ? '...' : '')
    );

    if (!clean) {
      console.log('[Speech] No text to flush');
      return;
    }

    // Set advancing flag immediately to prevent duplicate calls from
    // concurrent triggers (speech timeout + onend race condition)
    advancingRef.current = true;

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    clearLivePreview();

    lastSpeechTimeRef.current = 0;

    if (isEndInterviewIntent(clean)) {
      advancingRef.current = false;
      void endInterviewFromVoice(clean);
      return;
    }

    addCandidate(clean);

    void advanceAfterAnswer(clean);
  }

  function attachRecognitionHandlers() {
    const rec = recognitionRef.current;
    if (!rec) return;

    rec.onresult = (event) => {
      if (pausedForTtsRef.current) return;
      const e = event as {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript?: string } }>;
      };
      
      let interim = "";
      let hasNewFinal = false;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res?.isFinal) {
          // Pick the alternative with the highest confidence score
          let bestText = (res[0] as { transcript?: string })?.transcript ?? "";
          let bestConf = (res[0] as { confidence?: number })?.confidence ?? 0;
          const altCount = (res as unknown as { length: number }).length ?? 1;
          for (let k = 1; k < altCount; k++) {
            const alt = (res as unknown as Record<number, { transcript?: string; confidence?: number }>)[k];
            if (alt && (alt.confidence ?? 0) > bestConf) {
              bestConf = alt.confidence ?? 0;
              bestText = alt.transcript ?? bestText;
            }
          }
          finalBufferRef.current += bestText.trim() + " ";
          hasNewFinal = true;
        } else {
          interim += (res?.[0] as { transcript?: string })?.transcript ?? "";
        }
      }
      
      const trimmed = interim.trim();
      interimRef.current = trimmed;
      const displayText = `${finalBufferRef.current}${trimmed ? `${finalBufferRef.current && !finalBufferRef.current.endsWith(" ") ? " " : ""}${trimmed}` : ""}`.trim();
      setInterimText(displayText);
      
      // Update last speech time when we get any speech (final or interim)
      if (trimmed.length > 0 || hasNewFinal) {
        const now = Date.now();
        lastSpeechTimeRef.current = now;
        setSpeechError(null);
        
        // Clear any existing timeout
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        
        // Set a new timeout for when speech might be done
        speechTimeoutRef.current = setTimeout(() => {
          if (!sessionActiveRef.current || pausedForTtsRef.current) {
            return;
          }
          // Only auto-advance if we haven't had speech for the timeout period
          const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
          if (timeSinceLastSpeech >= SPEECH_TIMEOUT_MS && sessionActiveRef.current) {
            // Check if we have accumulated speech to process
            const accumulated = finalBufferRef.current.trim();
            if (accumulated.length > 0) {
              console.log('[Speech] Auto-advancing after silence timeout with:', accumulated.substring(0, 50) + '...');
              flushSpokenAnswer();
            }
          }
        }, SPEECH_TIMEOUT_MS);
      }
    };

    rec.onerror = (event) => {
      const err = (event as { error?: string })?.error;
      console.log('[Speech] Error:', err);
      
      if (err === "aborted") return;
      
      // For no-speech errors, be more lenient - don't immediately restart
      if (err === "no-speech" && sessionActiveRef.current && !pausedForTtsRef.current) {
        console.log('[Speech] No-speech detected, checking if we should restart...');
        
        // Only restart if we haven't had any speech recently and no accumulated text
        const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
        const hasAccumulatedText = finalBufferRef.current.trim().length > 0;
        
        if (timeSinceLastSpeech > 5000 && !hasAccumulatedText) {
          console.log('[Speech] Restarting after long silence with no accumulated text');
          scheduleRecognitionStart("no-speech-long-silence");
        } else {
          console.log('[Speech] Not restarting - recent speech or accumulated text exists');
        }
        return;
      }
      
      if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
        // If a session is already active (bot asked a question), keep it alive and
        // switch to typed-only so the candidate can still answer instead of losing progress.
        if (sessionActiveRef.current) {
          typedOnlyRef.current = true;
          setTypedAnswersOnly(true);
          if (micPhaseRef.current !== "bot_speaking") {
            setMicPhase("listening");
          }
          setSpeechError(
            err === "audio-capture"
              ? "No microphone found. Continue typing your answers below — click Submit typed reply to proceed."
              : "Microphone access was blocked. You can still continue using typed answers below — type your reply and click Submit typed reply.",
          );
          return;
        }
        // No active session yet — kill cleanly so the user can fix permissions and retry.
        sessionActiveRef.current = false;
        pausedForTtsRef.current = false;
        typedOnlyRef.current = false;
        setTypedAnswersOnly(false);
        setMicPhase("idle");
        setSpeechError(speechErrorMessage(err));
        releaseMicStream();
        return;
      }
      
      if (err === "network") {
        setSpeechError(speechErrorMessage("network"));
      }
      
      // For other errors, only restart if we're still in an active session
      if (sessionActiveRef.current && !pausedForTtsRef.current && !sessionFinalizedRef.current) {
        console.log('[Speech] Restarting after error:', err);
        scheduleRecognitionStart(`recover ${err ?? "error"}`);
      }
    };

    rec.onend = () => {
      if (sessionFinalizedRef.current || pausedForTtsRef.current) {
        return;
      }
      if (explicitStopRef.current) {
        explicitStopRef.current = false;
        finalBufferRef.current = "";
        interimRef.current = "";
        setInterimText("");
        commitAfterEndRef.current = false;
        setMicPhase("idle");
        void playClosingLine(
          "Alright, stopping here. Thanks for your time—you can mark this interview complete below when you’re ready.",
        );
        return;
      }
      if (!sessionActiveRef.current) {
        finalBufferRef.current = "";
        interimRef.current = "";
        setInterimText("");
        setMicPhase("idle");
        return;
      }
      if (commitAfterEndRef.current) {
        commitAfterEndRef.current = false;
        // Only stitch if not already pre-stitched by the Send button click handler.
        if (!finalBufferRef.current.trim()) {
          const stitch = `${finalBufferRef.current.trim()} ${interimRef.current.trim()}`.trim();
          if (stitch) {
            finalBufferRef.current = stitch + " ";
            interimRef.current = "";
            setInterimText("");
          }
        }
        const stitched = finalBufferRef.current.trim();
        const hadSpeech = stitched.length > 0;
        if (hadSpeech && isEndInterviewIntent(stitched)) {
          void endInterviewFromVoice(stitched);
          return;
        }
        flushSpokenAnswer();
        if (sessionActiveRef.current && !hadSpeech) {
          scheduleRecognitionStart("commit with empty buffer");
        }
        return;
      }
      scheduleRecognitionStart("onend");
    };
  }

  async function submitTypedReply() {
    const text = typedDraft.trim();
    if (!text || !sessionActiveRef.current || micPhase !== "listening" || advancingRef.current) return;
    if (isCodingSlotActive && !codingSlotSatisfied) {
      setSpeechError("Complete the coding challenge with Run & Submit in the editor first.");
      return;
    }
    setTypedDraft("");
    setSpeechError(null);
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (!typedOnlyRef.current) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    if (isEndInterviewIntent(text)) {
      void endInterviewFromVoice(text);
      return;
    }
    addCandidate(text);
    void advanceAfterAnswer(text);
  }

  async function startTypedOnly() {
    if (!integrityCanStart) {
      setSpeechError("Complete face enrollment before starting the interview.");
      return;
    }
    resetVoiceServicePrefs();
    setUsingBrowserVoice(false);
    sessionFinalizedRef.current = false;
    setSpeechError(null);
    resetVoiceValidationSession();
    releaseMicStream();
    typedOnlyRef.current = true;
    serverVoiceModeRef.current = false; // Force browser mode for typed-only
    setTypedAnswersOnly(true);
    updateVoiceValidation({
      status: "NOT_VERIFIED",
      note: "Typed-only mode used. Voice continuity cannot be guaranteed.",
    });
    sessionActiveRef.current = true;
    setProctorSessionActive(true);
    void fullscreen.requestFullscreen();
    pausedForTtsRef.current = false;
    commitAfterEndRef.current = false;
    explicitStopRef.current = false;
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    attachRecognitionHandlers();

    if (utterancesRef.current.length === 0) {
      setFetchingNextQuestion(true);
      const nextQ = await fetchNextQuestion({ slot: 1, lastAnswer: "", transcript: [], manipulationCount: manipulationCountRef.current });
      setFetchingNextQuestion(false);
      if (nextQ) {
        if (nextQ.manipulationDetected) setManipulationCount((prev) => prev + 1);
        if (nextQ.terminateInterview) {
          void abandonInterview(utterancesRef.current, "ai_manipulation");
          return;
        }
      }
      const q =
        nextQ?.question ??
        `We’ll go straight to technical for ${jdTitle}. First: name a core subsystem or stack you’d own in this kind of role and walk me through how you’ve built or run it in production—constraints, what broke, and how you verified it.`;
      botPromptIdxRef.current = 1;
      setBotPromptIdx(1);
      await addBot(q, {
        isCoding: nextQ?.isCoding,
        preferredLanguage: nextQ?.preferredLanguage,
        starterCode: nextQ?.starterCode,
      });
      if (sessionActiveRef.current) {
        setMicPhase("listening");
      }
      return;
    }

    setMicPhase("listening");
  }

  async function start() {
    if (!supported) return;
    if (!integrityCanStart) {
      setSpeechError("Complete face enrollment before starting the interview.");
      return;
    }
    resetVoiceServicePrefs(); // preferServerStt=true, preferServerTts=true
    sessionFinalizedRef.current = false;
    typedOnlyRef.current = false;
    setTypedAnswersOnly(false);
    setUsingBrowserVoice(false);
    setSpeechError(null);
    resetVoiceValidationSession();

    // Browser STT (Web Speech API) is the default — zero-latency, no server round-trip.
    // Server Whisper mode is only used when voiceServicePrefs.preferServerStt is explicitly true.
    if (voiceServicePrefs.preferServerStt) {
      const gotMic = await ensureMicStream();
      if (gotMic) {
        serverVoiceModeRef.current = true;
        startVoiceMonitor(micStreamRef.current!);
      } else {
        // No mic stream — fall back to browser SpeechRecognition
        serverVoiceModeRef.current = false;
        voiceServicePrefs.preferServerStt = false;
        if (!recognitionRef.current) {
          setSpeechError(
            "Microphone unavailable and no browser speech support. Switching to typed answers.",
          );
          void startTypedOnly();
          return;
        }
        setUsingBrowserVoice(true);
      }
    } else {
      // Browser STT mode: SpeechRecognition manages its own mic stream
      serverVoiceModeRef.current = false;
      if (!recognitionRef.current) {
        setSpeechError(
          "Browser speech recognition is not supported. Switching to typed answers.",
        );
        void startTypedOnly();
        return;
      }
      setUsingBrowserVoice(true);
    }

    await fetch(`/api/interviews/${interviewId}/start`, { method: "POST" }).catch(() => null);

    void startSessionRecording();
    sessionActiveRef.current = true;
    setProctorSessionActive(true);
    void fullscreen.requestFullscreen();
    pausedForTtsRef.current = false;
    commitAfterEndRef.current = false;
    explicitStopRef.current = false;
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    attachRecognitionHandlers();

    const rec = recognitionRef.current;

    if (utterancesRef.current.length === 0) {
      setFetchingNextQuestion(true);
      const nextQ = await fetchNextQuestion({ slot: 1, lastAnswer: "", transcript: [], manipulationCount: manipulationCountRef.current });
      setFetchingNextQuestion(false);
      if (nextQ) {
        if (nextQ.manipulationDetected) setManipulationCount((prev) => prev + 1);
        if (nextQ.terminateInterview) {
          void abandonInterview(utterancesRef.current, "ai_manipulation");
          return;
        }
      }
      const q =
        nextQ?.question ??
        `We’ll go straight to technical for ${jdTitle}. First: name a core subsystem or stack you’d own in this kind of role and walk me through how you’ve built or run it in production—constraints, what broke, and how you verified it.`;
      botPromptIdxRef.current = 1;
      setBotPromptIdx(1);
      await addBot(q, {
        isCoding: nextQ?.isCoding,
        preferredLanguage: nextQ?.preferredLanguage,
        starterCode: nextQ?.starterCode,
      });
      if (sessionActiveRef.current) {
        setMicPhase("listening");
        attachRecognitionHandlers();
        if (serverVoiceModeRef.current) {
          startAnswerRecording();
        } else if (!typedOnlyRef.current) {
          scheduleRecognitionStart("open mic after intro");
        }
      }
      return;
    }

    if (!sessionActiveRef.current) {
      setMicPhase("idle");
      return;
    }

    if (serverVoiceModeRef.current) {
      setMicPhase("listening");
      startAnswerRecording();
      return;
    }

    if (!rec) {
      scheduleRecognitionStart("start missing rec");
      return;
    }

    try {
      rec.start();
      setMicPhase("listening");
    } catch (err) {
      console.warn("[Speech] Failed to start recognition:", err);
      scheduleRecognitionStart("start catch");
    }
  }

  function stop() {
    sessionActiveRef.current = false;
    typedOnlyRef.current = false;
    setTypedAnswersOnly(false);
    pausedForTtsRef.current = false;
    commitAfterEndRef.current = false;
    explicitStopRef.current = true;
    void stopAnswerRecordingBlob();
    releaseMicStream();
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    cancelActiveTts();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    const rec = recognitionRef.current;
    if (!rec) {
      explicitStopRef.current = false;
      finalizeVoiceValidation();
      void stopSessionRecordingAndUpload();
      void playClosingLine(
        "Alright, stopping here. Thanks for your time—you can mark this interview complete below when you’re ready.",
      );
      return;
    }
    try {
      rec.stop();
      finalizeVoiceValidation();
      void stopSessionRecordingAndUpload();
    } catch {
      explicitStopRef.current = false;
      finalizeVoiceValidation();
      void playClosingLine(
        "Alright, stopping here. Thanks for your time—you can mark this interview complete below when you’re ready.",
      );
    }
  }

  silentEndBecauseUserLeftRef.current = () => {
    releaseMicStream();
    cancelActiveTts();
    void stopAnswerRecordingBlob();
    if (!sessionActiveRef.current) {
      return;
    }
    sessionActiveRef.current = false;
    typedOnlyRef.current = false;
    setTypedAnswersOnly(false);
    pausedForTtsRef.current = false;
    commitAfterEndRef.current = false;
    explicitStopRef.current = false;
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setMicPhase("idle");
  };

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden" && sessionActiveRef.current) {
        // Increment tab switch count
        const newCount = tabSwitchCountRef.current + 1;
        tabSwitchCountRef.current = newCount;
        setTabSwitchCount(newCount);

        if (videoProctoringRequiredRef.current) {
          const phoneVisible = proctoring.snapshot.lastReasons.some((r) => r.includes("Recording device"));
          if (phoneVisible) {
            proctoring.reportExternalEvent(
              "cross_signal",
              ["Tab switch while recording device was visible in camera"],
              "hard",
            );
          }
        }

        // Stop audio/mic immediately
        silentEndBecauseUserLeftRef.current();

        // Show warning when user returns
        setShowTabWarning(true);

        // If 2nd switch, terminate interview after showing warning
        if (newCount >= 2) {
          setTimeout(() => {
            void abandonInterview(utterancesRef.current, "tab_switch_violation");
          }, 3000); // 3s delay to show final warning
        }
      }
    };
    const onPageHide = () => {
      silentEndBecauseUserLeftRef.current();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      silentEndBecauseUserLeftRef.current();
    };
  }, []);

  const listening = micPhase === "listening";
  const botSpeaking = micPhase === "bot_speaking";

  type MicPreviewStatus = "idle" | "listening" | "hearing" | "quiet" | "transcribing" | "error" | "mic_off";

  const micPreviewStatus: MicPreviewStatus = (() => {
    if (whisperProcessing) return "transcribing";
    if (whisperError && listening && !typedAnswersOnly) return "error";
    // In browser STT mode, SpeechRecognition manages its own stream — micStreamRef is not used
    if (listening && !typedAnswersOnly && serverVoiceModeRef.current && !micStreamRef.current?.active) return "mic_off";
    if (!listening || typedAnswersOnly) return "idle";
    if (answerRecording && micLevel >= 10) return "hearing";
    if (answerRecording) return "quiet";
    return "listening";
  })();

  const micStatusMeta: Record<MicPreviewStatus, { label: string; className: string }> = {
    idle: { label: "Mic idle", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
    listening: { label: "Listening — speak now", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" },
    hearing: { label: "Hearing you", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
    quiet: { label: "Mic on — speak louder", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    transcribing: { label: "Transcribing…", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200" },
    error: { label: "Mic issue", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
    mic_off: { label: "Mic disconnected", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
  };

  const browserSttActive = true; // Force browser mode always
  const spokenPreviewText = typedAnswersOnly
    ? typedDraft
    : interimText; // Always use interimText for live preview

  if (!supported) {
    return (
      <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Voice interview is not supported in this browser. Please use Chrome or Edge on desktop.
      </div>
    );
  }

  return (
    <div className="card p-4">
      {videoProctoringRequired ? (
        <VideoProctorPanel
          proctoring={proctoring}
          canStart={integrityCanStart}
          sessionActive={proctorSessionActive}
          onRequestCamera={() => void proctoring.requestCamera()}
          onRetryEnrollment={() => void proctoring.retryEnrollment()}
          onCancelStuck={() => proctoring.resetCameraSetup()}
        />
      ) : (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Interview integrity</span>
          <p className="mt-1">
            Fullscreen mode and tab-switch monitoring are active. Camera proctoring is not required for your candidate type.
          </p>
        </div>
      )}
      {speechError ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="font-medium">Microphone / speech</div>
          <p className="mt-1">{speechError}</p>
          <p className="mt-2 text-xs opacity-90">
            Use <span className="font-medium">Chrome or Edge</span> on desktop, HTTPS or localhost, and allow microphone
            for this site. Web Speech sends audio to the browser vendor’s recognition service (not our servers).
          </p>
        </div>
      ) : null}
      {sessionActiveRef.current && micPhase === "listening" &&
          !typedAnswersOnly &&
          serverVoiceModeRef.current && !micStreamRef.current?.active && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
                <div className="font-medium">Microphone disconnected</div>

                <p className="mt-1">
                  Your microphone appears to be disconnected.
                  Please reconnect it or use typed answers.
                </p>
              </div>
          )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="font-medium">Voice interview ({interviewMode})</div>
            {timerStarted && (
              <div className={`text-sm font-mono font-semibold px-3 py-0.5 rounded-full ${
                mainTimerPaused
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                  : secondsLeft < 300
                    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}>
                {mainTimerPaused ? `Interview ${formatTime(secondsLeft)} (paused)` : formatTime(secondsLeft)}
              </div>
            )}
            {codingTimerActive && (
              <div className={`text-sm font-mono font-semibold px-3 py-0.5 rounded-full ${
                codingSecondsLeft < 120
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200"
              }`}>
                Coding {formatTime(codingSecondsLeft)}
              </div>
            )}
            {timeExpired && (
              <div className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-sm font-semibold px-3 py-0.5 rounded-full">
                Time expired
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!timeExpired && (
              <button
                onClick={() => setShowConfirm(true)}
                className="text-xs text-red-600 underline hover:text-red-800 dark:text-red-400"
              >
                I&apos;m not prepared — end interview
              </button>
            )}
            {!timeExpired && (sessionRecording || sessionRecordingUploaded) && (
              <span
                className={`text-xs px-2 py-1 rounded border ${
                  sessionRecording
                    ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                    : "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                }`}
              >
                {sessionRecording ? "Recording session" : "Session saved"}
              </span>
            )}
            <div
              className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                botSpeaking
                  ? "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                  : listening
                    ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                    : timeExpired
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
              role="status"
              aria-live="polite"
            >
              {botSpeaking
                ? "Bot speaking…"
                : listening
                  ? typedAnswersOnly
                    ? "Typed mode"
                    : "Mic on"
                  : timeExpired
                    ? "Time expired"
                    : "Mic off"}
            </div>
          </div>
        </div>

        {showConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              // Clicking the backdrop cancels.
              if (e.target === e.currentTarget) setShowConfirm(false);
            }}
          >
            <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold">End interview?</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                This will be recorded. Your partial responses will still be assessed.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void abandonInterview(utterances, "not_prepared")}
                  disabled={abandoning}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700 disabled:opacity-50"
                >
                  {abandoning ? "Ending..." : "Yes, end interview"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showTabWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border-2 border-red-500 bg-white p-6 shadow-xl dark:bg-zinc-900 space-y-4">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                {tabSwitchCount === 1 ? "Tab switch detected" : "Interview ending"}
              </h2>

              <div className="space-y-2 text-sm">
                <p className="font-semibold">
                  You switched tabs/windows during the interview. This is not allowed.
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {tabSwitchCount === 1
                    ? "This is your first warning. One more tab switch will automatically terminate your interview."
                    : "You have exceeded the maximum allowed tab switches (2). Your interview is being terminated and marked as WITHDRAWN."}
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs font-mono">
                    Tab switches: <span className="font-bold text-red-600">{tabSwitchCount}/2</span>
                  </p>
                </div>
              </div>

              {tabSwitchCount === 1 ? (
                <button
                  onClick={() => setShowTabWarning(false)}
                  className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  I Understand - Continue Interview
                </button>
              ) : (
                <div className="text-center text-sm text-zinc-500">
                  Redirecting to dashboard in 3 seconds...
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Using <span className="font-medium text-zinc-700 dark:text-zinc-300">browser speech recognition</span> for
          live voice transcription. Speak your answer, and it will appear in real-time. Click{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Send answer</span> when finished speaking.
          {" "}Session audio records automatically from Start.
        </p>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">Voice continuity</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${
              voiceValidation.status === "VERIFIED"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : voiceValidation.status === "RISK"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : voiceValidation.status === "FAILED"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}>
              {voiceValidation.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">{voiceValidation.note}</p>
          {(voiceValidation.averageSimilarity != null || voiceValidation.endSimilarity != null) && (
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              avg: {voiceValidation.averageSimilarity ?? "-"} | end: {voiceValidation.endSimilarity ?? "-"} | flags: {voiceValidation.flaggedChecks}/{voiceValidation.checks}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {micPhase === "idle" && !timeExpired ? (
            <>
              <button
                className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-all duration-200 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={!integrityCanStart}
                onClick={() => void start()}
              >
                Start (mic)
              </button>
              <button
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={!integrityCanStart}
                onClick={() => void startTypedOnly()}
              >
                Typed answers only
              </button>
            </>
          ) : timeExpired ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                Time has expired. Click Mark complete below to submit your responses for assessment.
              </p>
            </div>
          ) : (
            <button
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              type="button"
              onClick={stop}
            >
              Stop session
            </button>
          )}
        </div>
      </div>

      {usingBrowserVoice && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <span className="font-semibold">Browser voice mode active.</span>{" "}
          Using your browser&apos;s built-in speech recognition and text-to-speech for real-time interaction.
        </div>
      )}

      {(fetchingNextQuestion || (botSpeaking && utterances.length === 0)) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            {fetchingNextQuestion
              ? "Preparing the next question — please wait…"
              : "The interviewer is asking the question — listen carefully…"}
          </span>
        </div>
      )}

      {listening && !timeExpired && (
        <div className="sticky top-0 z-10 mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
          <div
            className={`rounded-xl border-2 p-4 transition-colors ${
              micPreviewStatus === "hearing"
                ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                : micPreviewStatus === "error" || micPreviewStatus === "mic_off"
                  ? "border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                  : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {typedAnswersOnly ? "Your answer (typed)" : "Your answer (live)"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${micStatusMeta[micPreviewStatus].className}`}
                role="status"
                aria-live="polite"
              >
                {(micPreviewStatus === "hearing" || micPreviewStatus === "listening") && (
                  <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                )}
                {micPreviewStatus === "transcribing" && (
                  <span className="h-2 w-2 rounded-full border-2 border-current border-t-transparent animate-spin" />
                )}
                {micStatusMeta[micPreviewStatus].label}
              </span>
            </div>

            {!typedAnswersOnly && (
              <div className="mt-3 flex h-8 items-end gap-1" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, i) => {
                  const threshold = (i + 1) * (100 / 12);
                  const active = micLevel >= threshold - 4;
                  return (
                    <div
                      key={i}
                      className={`w-2 flex-1 rounded-sm transition-all duration-150 ${
                        active
                          ? micPreviewStatus === "hearing"
                            ? "bg-emerald-500"
                            : "bg-blue-400"
                          : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                      style={{ height: active ? `${Math.max(30, Math.min(100, micLevel))}%` : "20%" }}
                    />
                  );
                })}
              </div>
            )}

            <div className="mt-3 min-h-[4.5rem] max-h-32 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-950">
              {spokenPreviewText ? (
                <p className="break-words text-zinc-800 dark:text-zinc-100">{spokenPreviewText}</p>
              ) : (
                <p className="text-zinc-400 dark:text-zinc-500">
                  {typedAnswersOnly
                    ? "Type your answer in the box below."
                    : micPreviewStatus === "transcribing"
                      ? "Converting your speech to text…"
                      : micPreviewStatus === "hearing"
                        ? "Keep speaking — your words appear here as you talk."
                        : "Start speaking — live preview will show here so you know the mic is working."}
                </p>
              )}
            </div>

            {!typedAnswersOnly && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Live transcription using browser speech recognition. Your words appear as you speak.
                Click <span className="font-medium">Send answer</span> to continue to the next question.
              </p>
            )}
            {whisperError && (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{whisperError}</p>
            )}
          </div>

          {!typedAnswersOnly && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200" htmlFor="whisper-lang">
                Answer language (Whisper STT)
              </label>
              <select
                id="whisper-lang"
                value={whisperLang}
                onChange={(e) => setWhisperLang(e.target.value)}
                className="mt-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
              >
                {WHISPER_LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200" htmlFor="typed-interview-reply">
              {typedAnswersOnly ? "Your answer (typed)" : "Or type your answer if the mic is flaky"}
            </label>
            <textarea
              id="typed-interview-reply"
              className="input-base mt-1 min-h-[88px]"
              value={typedDraft}
              onChange={(e) => setTypedDraft(e.target.value)}
              placeholder="Write your technical answer here…"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <p className="text-xs text-zinc-500 sm:mr-auto">
                {typedAnswersOnly
                  ? <><span className="font-medium">Submit typed reply</span> continues · <span className="font-medium">Stop session</span> ends</>
                  : <><span className="font-medium">Send answer</span> finalizes mic · <span className="font-medium">Submit typed reply</span> uses text box</>}
              </p>
              <div className="flex flex-wrap gap-2">
                {!typedAnswersOnly && (
                  <button
                    type="button"
                    disabled={whisperProcessing || fetchingNextQuestion}
                    className="shrink-0 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors duration-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    onClick={() => void sendVoiceAnswer()}
                  >
                    Send answer
                  </button>
                )}
                <button
                  type="button"
                  disabled={fetchingNextQuestion}
                  className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-all duration-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-200"
                  onClick={() => void submitTypedReply()}
                >
                  Submit typed reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={transcriptContainerRef}
        className="mt-4 max-h-[220px] overflow-y-auto overscroll-contain rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900"
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Conversation history
        </p>
        {utterances.length ? (
          utterances.map((u, idx) => (
            <div key={idx} className="mb-2">
              <span className="font-medium">{u.speaker === "BOT" ? "Bot" : "You"}:</span>{" "}
              <span className="break-words">{u.text}</span>
            </div>
          ))
        ) : (
          <div className="text-zinc-600 dark:text-zinc-400">
            Press <span className="font-medium">Start (mic)</span> or <span className="font-medium">Use typed answers only</span>
            : you will hear the first question, then you can speak and/or type your reply.
          </div>
        )}
      </div>

      {timeExpired && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <span className="font-medium">Ready to submit:</span> Your interview responses have been recorded. Click &quot;Mark complete&quot; below to get your AI assessment and feedback.
          </p>
        </div>
      )}
    </div>
  );
}
