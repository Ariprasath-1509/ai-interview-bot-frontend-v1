"use client";

import { useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { VoiceInterviewClient } from "./VoiceInterviewClient";
import { Loader2 } from "lucide-react";
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

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex w-fit items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed"
      type="submit"
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Assessing interview...
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
  completeInterview,
}: {
  interviewId: string;
  jdTitle: string;
  rubricJson: string | null;
  candidateProfileJson: string | null;
  durationMinutes: number;
  interviewMode: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completeInterview: (formData: FormData) => Promise<any>;
}) {
  const [transcriptJson, setTranscriptJson] = useState("");
  const [voiceValidation, setVoiceValidation] = useState<VoiceValidationSnapshot | null>(null);

  const onTranscriptChange = useCallback((json: string) => {
    setTranscriptJson(json);
  }, []);

  const onVoiceValidationChange = useCallback((snapshot: VoiceValidationSnapshot) => {
    setVoiceValidation(snapshot);
  }, []);

  const hardBlockSubmit = voiceValidation?.status === "FAILED";

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h2 className="text-base font-semibold">Voice Interview</h2>
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          AI-scored on <span className="font-medium text-zinc-700 dark:text-zinc-300">Technical Knowledge</span> and{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Communication</span> vs the JD.
          Requires <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">CLAUDE_API_KEY</code>;
          otherwise a heuristic placeholder runs.
        </p>
      </div>

      <VoiceInterviewClient
        jdTitle={jdTitle}
        interviewId={interviewId}
        rubricJson={rubricJson}
        candidateProfileJson={candidateProfileJson}
        durationMinutes={durationMinutes}
        interviewMode={interviewMode}
        onTranscriptChange={onTranscriptChange}
        onVoiceValidationChange={onVoiceValidationChange}
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

      <form action={completeInterview} className="grid gap-4 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <input type="hidden" name="interviewId" value={interviewId} />
        <input type="hidden" name="transcriptJson" value={transcriptJson} />
        <input type="hidden" name="voiceValidationJson" value={voiceValidation ? JSON.stringify(voiceValidation) : ""} />

        <label className="grid gap-1.5 text-sm font-medium">
          Candidate notes
          <span className="text-xs font-normal text-zinc-500">Optional — visible to the reviewer</span>
          <textarea
            className="min-h-[100px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-normal transition-colors focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500 dark:focus:bg-zinc-950"
            name="candidateNotes"
            placeholder="Anything you want the reviewer to know…"
          />
        </label>

        <SubmitButton disabled={hardBlockSubmit} />

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          This will trigger AI assessment which may take 30-60 seconds. Please wait.
        </p>
      </form>
    </div>
  );
}
