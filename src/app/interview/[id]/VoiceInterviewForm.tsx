"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { VoiceInterviewClient } from "./VoiceInterviewClient";
import { CodeWorkspace } from "./CodeWorkspace";
import type { CodeSubmissionRecord, QuestionMeta } from "./codingTypes";
import { isCodingQuestion } from "./codingTypes";
import { Loader2 } from "lucide-react";
import { integrityModeLabel, type ProctoringMode } from "@/lib/proctoring/mode";

type VoiceValidationSnapshot = {
  status: "PENDING_ENROLLMENT" | "VERIFIED" | "RISK" | "FAILED" | "NOT_VERIFIED";
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

function SubmitButton({
  disabled,
  waitingRecording,
  onMarkComplete,
}: {
  disabled?: boolean;
  waitingRecording?: boolean;
  onMarkComplete: () => void;
}) {
  const { pending } = useFormStatus();
  const busy = pending || waitingRecording;

  return (
    <button
      className="btn-primary inline-flex w-fit items-center gap-2 px-6 py-2.5 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      type="button"
      disabled={busy || disabled}
      onClick={onMarkComplete}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {waitingRecording ? "Saving session recording…" : "Running AI assessment…"}
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Mark complete
        </>
      )}
    </button>
  );
}

export function VoiceInterviewForm({
  interviewId,
  jdTitle,
  rubricJson,
  candidateProfileJson,
  durationMinutes,
  interviewMode,
  proctoringMode,
  candidateSource,
  includeProgrammingQuestions,
  completeInterview,
}: {
  interviewId: string;
  jdTitle: string;
  rubricJson: string | null;
  candidateProfileJson: string | null;
  durationMinutes: number;
  interviewMode: string;
  proctoringMode: ProctoringMode;
  candidateSource: string | null;
  includeProgrammingQuestions: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completeInterview: (formData: FormData) => Promise<any>;
}) {
  const [transcriptJson, setTranscriptJson] = useState("");
  const [voiceValidation, setVoiceValidation] = useState<VoiceValidationSnapshot | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta>({
    question: "",
    slot: 0,
    isCoding: false,
    preferredLanguage: "python",
  });
  const [codeSubmissions, setCodeSubmissions] = useState<CodeSubmissionRecord[]>([]);
  const latestSubmissionRef = useRef<CodeSubmissionRecord | null>(null);
  const [codingTimer, setCodingTimer] = useState({ active: false, secondsLeft: 0, expired: false });
  const [recordingState, setRecordingState] = useState({ recording: false, uploaded: false, uploading: false });
  const [waitingRecording, setWaitingRecording] = useState(false);
  const [mediaHealth, setMediaHealth] = useState<{
    mediaReady?: boolean;
    whisperReachable?: boolean;
    coquiReachable?: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/ai/media-health", { cache: "no-store" }).catch(() => null);
      if (!res?.ok || cancelled) return;
      const data = (await res.json()) as {
        mediaReady?: boolean;
        whisperReachable?: boolean;
        coquiReachable?: boolean;
      };
      if (!cancelled) setMediaHealth(data);
    })();
    return () => { cancelled = true; };
  }, []);
  const ensureRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const finalizeSessionRef = useRef<(() => void) | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const registerFinalizeSession = useCallback((fn: () => void) => {
    finalizeSessionRef.current = fn;
  }, []);

  const submitAnswerRef = useRef<((answer: string) => void) | null>(null);

  const hardBlockSubmit = voiceValidation?.status === "FAILED" && !timeExpired;

  const isCodingSlotActive = isCodingQuestion(
    questionMeta.question,
    questionMeta.isCoding,
    includeProgrammingQuestions,
  );
  const codingSlotSatisfied =
    !isCodingSlotActive ||
    codeSubmissions.some((s) => s.slot === questionMeta.slot && !!s.submittedAt);

  const handleMarkComplete = useCallback(async () => {
    if (hardBlockSubmit) return;
    finalizeSessionRef.current?.();
    setWaitingRecording(true);
    try {
      await ensureRecordingRef.current?.();
    } finally {
      setWaitingRecording(false);
    }
    formRef.current?.requestSubmit();
  }, [hardBlockSubmit]);

  const onTranscriptChange = useCallback((json: string) => {
    setTranscriptJson(json);
  }, []);

  const onVoiceValidationChange = useCallback((snapshot: VoiceValidationSnapshot) => {
    setVoiceValidation(snapshot);
  }, []);

  const onQuestionMetaChange = useCallback((meta: QuestionMeta) => {
    setQuestionMeta(meta);
  }, []);

  const onSubmissionChange = useCallback((sub: CodeSubmissionRecord) => {
    latestSubmissionRef.current = sub;
    setCodeSubmissions((prev) => {
      const withoutSlot = prev.filter((s) => s.slot !== sub.slot);
      return [...withoutSlot, sub].sort((a, b) => a.slot - b.slot);
    });
  }, []);

  const onSubmitAsAnswer = useCallback((answer: string) => {
    if (latestSubmissionRef.current) {
      const finalized: CodeSubmissionRecord = {
        ...latestSubmissionRef.current,
        submittedAt: new Date().toISOString(),
      };
      setCodeSubmissions((prev) => {
        const withoutSlot = prev.filter((s) => s.slot !== finalized.slot);
        return [...withoutSlot, finalized].sort((a, b) => a.slot - b.slot);
      });
    }
    submitAnswerRef.current?.(answer);
  }, []);

  const recordingBlocksSubmit =
    (recordingState.recording || recordingState.uploading) && !recordingState.uploaded;

  return (
    <div className="card flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{jdTitle}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {interviewMode} interview · speak or type your answers, then send when ready
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          {integrityModeLabel(proctoringMode)}
          {candidateSource ? ` (${candidateSource})` : ""}
        </p>
      </div>

      {mediaHealth && mediaHealth.mediaReady === false && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="font-semibold">Voice services warming up.</span>{" "}
          Whisper STT {!mediaHealth.whisperReachable ? "unavailable" : "ok"},{" "}
          Coqui TTS {!mediaHealth.coquiReachable ? "unavailable" : "ok"}.
          You can still type answers; voice playback and transcription may fail until services are ready.
        </div>
      )}

      <VoiceInterviewClient
        jdTitle={jdTitle}
        interviewId={interviewId}
        rubricJson={rubricJson}
        candidateProfileJson={candidateProfileJson}
        durationMinutes={durationMinutes}
        interviewMode={interviewMode}
        proctoringMode={proctoringMode}
        candidateSource={candidateSource}
        onTranscriptChange={onTranscriptChange}
        onVoiceValidationChange={onVoiceValidationChange}
        onTimeExpired={() => setTimeExpired(true)}
        onRegisterSubmitAnswer={(fn) => { submitAnswerRef.current = fn; }}
        onRegisterEnsureRecording={(fn) => { ensureRecordingRef.current = fn; }}
        onRegisterFinalizeSession={registerFinalizeSession}
        onSessionRecordingChange={setRecordingState}
        isCodingSlotActive={isCodingSlotActive}
        codingSlotSatisfied={codingSlotSatisfied}
        codeSubmissionJson={codeSubmissions.length > 0 ? JSON.stringify(codeSubmissions) : ""}
        onCodingTimerChange={setCodingTimer}
        onQuestionMetaChange={onQuestionMetaChange}
      />

      {isCodingSlotActive && !codingSlotSatisfied && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <span className="font-semibold">Coding slot active.</span>{" "}
          The main interview timer is paused. A separate{" "}
          <strong>{codingTimer.active ? `${Math.ceil(codingTimer.secondsLeft / 60)} min` : "15 min"}</strong> coding timer is running.
          Use <strong>Run &amp; Submit</strong> in the editor below before advancing with voice or typed answers.
        </div>
      )}

      {isCodingSlotActive && !codingSlotSatisfied && codingTimer.expired && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="font-semibold">Coding time ended.</span> The main interview timer has resumed. Submit your code with <strong>Run &amp; Submit</strong> when ready.
        </div>
      )}

      <CodeWorkspace
        questionMeta={questionMeta}
        codingEnabled={isCodingSlotActive}
        onSubmissionChange={onSubmissionChange}
        onSubmitAsAnswer={onSubmitAsAnswer}
        codingSecondsLeft={codingTimer.active ? codingTimer.secondsLeft : null}
        codingTimerActive={codingTimer.active}
      />

      {voiceValidation && (
        <div className={`rounded-lg border p-3 text-xs ${
          voiceValidation.status === "FAILED"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200"
            : voiceValidation.status === "RISK"
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
              : voiceValidation.status === "NOT_VERIFIED"
                ? "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"
        }`}>
          <span className="font-semibold">Identity continuity:</span> {voiceValidation.status.replace(/_/g, " ")} — {voiceValidation.note}
        </div>
      )}

      <form ref={formRef} action={completeInterview} className="grid gap-4 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <input type="hidden" name="interviewId" value={interviewId} />
        <input type="hidden" name="transcriptJson" value={transcriptJson} />
        <input type="hidden" name="voiceValidationJson" value={voiceValidation ? JSON.stringify(voiceValidation) : ""} />
        <input type="hidden" name="codeSubmissionJson" value={codeSubmissions.length > 0 ? JSON.stringify(codeSubmissions) : ""} />

        <label className="grid gap-1.5 text-sm font-medium">
          Candidate notes
          <span className="text-xs font-normal text-zinc-500">Optional — visible to the reviewer</span>
          <textarea
            className="min-h-[100px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-normal transition-colors focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500 dark:focus:bg-zinc-950"
            name="candidateNotes"
            placeholder="Anything you want the reviewer to know…"
          />
        </label>

        <SubmitButton
          disabled={hardBlockSubmit || recordingBlocksSubmit}
          waitingRecording={waitingRecording}
          onMarkComplete={handleMarkComplete}
        />

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Session recording uploads first, then AI assessment runs in the background (typically 30–90 seconds). Please keep this tab open.
        </p>
        {recordingBlocksSubmit && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Session recording is still in progress — Mark complete will be available once upload finishes.
          </p>
        )}
      </form>
    </div>
  );
}
