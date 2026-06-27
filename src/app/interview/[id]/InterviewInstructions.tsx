"use client";

import { useEffect, useState } from "react";
import {
  Mic, Send, SkipForward, Square, CheckCircle, Code2,
  AlertTriangle, Ban, Volume2, Clock, ChevronRight,
} from "lucide-react";

type Props = {
  jdTitle: string;
  durationMinutes: number;
  proctoringMode: string;
  includeProgrammingQuestions: boolean;
  onReady: () => void;
};

const TOTAL_SECONDS = 120;
const ALLOW_SKIP_AFTER = 30;

function ButtonPreview({
  icon,
  label,
  variant = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "green";
}) {
  const styles: Record<string, string> = {
    primary: "bg-violet-600 text-white border-violet-700",
    secondary: "bg-white text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600",
    danger: "bg-red-600 text-white border-red-700",
    green: "bg-emerald-600 text-white border-emerald-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold shadow-sm ${styles[variant]}`}>
      {icon}
      {label}
    </span>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-violet-600 dark:text-violet-400">{icon}</span>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Step({ num, text }: { num: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
        {num}
      </span>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{text}</p>
    </div>
  );
}

function DontItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{text}</p>
    </div>
  );
}

function ViolationItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{text}</p>
    </div>
  );
}

export function InterviewInstructions({ jdTitle, durationMinutes, proctoringMode, includeProgrammingQuestions, onReady }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), ALLOW_SKIP_AFTER * 1000);
    return () => clearTimeout(skipTimer);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) { onReady(); return; }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, onReady]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = ((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-50 dark:bg-[#050505]">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <Clock className="h-4 w-4" />
            Please read carefully — interview starts in {mins}:{secs.toString().padStart(2, "0")}
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Interview Instructions</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {jdTitle} · {durationMinutes} min {proctoringMode === "video" ? "· Video proctored" : ""}
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">

          {/* How the interview works */}
          <Section icon={<Mic className="h-5 w-5" />} title="How the interview works">
            <div className="flex flex-col gap-2.5">
              <Step num={1} text={<>Click <ButtonPreview icon={<Mic className="h-3.5 w-3.5" />} label="Start session" variant="primary" /> to begin. The AI interviewer will speak your first question.</>} />
              <Step num={2} text={<>Listen to the question — it is read aloud and shown on screen. Wait for it to finish before speaking.</>} />
              <Step num={3} text={<>Speak your answer clearly into your microphone. You will see a live preview of what the system hears.</>} />
              <Step num={4} text={<>When done speaking, click <ButtonPreview icon={<Send className="h-3.5 w-3.5" />} label="Send answer" variant="primary" /> to submit. The AI will then ask the next question.</>} />
            </div>
          </Section>

          {/* Your buttons */}
          <Section icon={<ChevronRight className="h-5 w-5" />} title="Buttons you will see">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <ButtonPreview icon={<Mic className="h-3.5 w-3.5" />} label="Start session" variant="primary" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Begins the interview and starts the timer</p>
              </div>
              <div className="flex flex-col gap-1">
                <ButtonPreview icon={<Send className="h-3.5 w-3.5" />} label="Send answer" variant="primary" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Submits your spoken or typed answer</p>
              </div>
              <div className="flex flex-col gap-1">
                <ButtonPreview icon={<SkipForward className="h-3.5 w-3.5" />} label="Skip question" variant="secondary" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Skip if you cannot answer — use sparingly</p>
              </div>
              <div className="flex flex-col gap-1">
                <ButtonPreview icon={<Square className="h-3.5 w-3.5" />} label="Stop session" variant="danger" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ends the interview early — cannot be undone</p>
              </div>
              <div className="flex flex-col gap-1">
                <ButtonPreview icon={<Volume2 className="h-3.5 w-3.5" />} label="Replay question" variant="secondary" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Plays the current question again</p>
              </div>
              <div className="flex flex-col gap-1">
                <ButtonPreview icon={<CheckCircle className="h-3.5 w-3.5" />} label="Mark complete" variant="green" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Submit your final interview when all done</p>
              </div>
            </div>
          </Section>

          {/* Typing fallback */}
          <Section icon={<Send className="h-5 w-5" />} title="If your microphone does not work">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                You can type your answers in the text box that appears below the question. Type your answer and click <ButtonPreview icon={<Send className="h-3.5 w-3.5" />} label="Send answer" variant="primary" />.
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Voice input gives the best experience. Allow microphone access when your browser asks.
              </p>
            </div>
          </Section>

          {/* Coding questions */}
          {includeProgrammingQuestions && (
            <Section icon={<Code2 className="h-5 w-5" />} title="Coding questions">
              <div className="flex flex-col gap-2.5">
                <Step num={1} text="When a coding question appears, a code editor opens below the chat. The main timer pauses." />
                <Step num={2} text="You have 15 minutes to write and test your solution in the code editor." />
                <Step num={3} text={<>Select your language, write your code, then click <ButtonPreview icon={<Code2 className="h-3.5 w-3.5" />} label="Run & Submit" variant="green" /> to execute and submit it.</>} />
                <Step num={4} text="After submitting the code, the main interview timer resumes and the AI asks the next question." />
              </div>
            </Section>
          )}

          {/* Violations */}
          {proctoringMode !== "none" && (
            <Section icon={<AlertTriangle className="h-5 w-5" />} title="Integrity monitoring — these will terminate your interview">
              <div className="flex flex-col gap-2">
                <ViolationItem text="Switching to another browser tab or window more than 2 times" />
                <ViolationItem text="Leaving fullscreen mode repeatedly" />
                {proctoringMode === "video" && (
                  <>
                    <ViolationItem text="No face visible in camera for extended periods" />
                    <ViolationItem text="Multiple people detected in the camera view" />
                    <ViolationItem text="Voice identity mismatch — the system checks your voice continuously" />
                  </>
                )}
                <ViolationItem text="Attempting to manipulate or confuse the AI interviewer" />
              </div>
            </Section>
          )}

          {/* Don'ts */}
          <Section icon={<Ban className="h-5 w-5" />} title="Do NOT do these during the interview">
            <div className="flex flex-col gap-2">
              <DontItem text="Do not use ChatGPT, Google, or any external help" />
              <DontItem text="Do not switch browser tabs or open other windows" />
              <DontItem text="Do not refresh or close this page mid-interview — your progress will be lost" />
              <DontItem text="Do not ask another person to answer on your behalf" />
              <DontItem text="Do not say 'stop interview', 'end session', or 'I'm done' unless you want to end early — the AI will take it literally" />
            </div>
          </Section>

          {/* Quick tips */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
            <p className="mb-2 font-semibold text-emerald-800 dark:text-emerald-300">Quick tips for best results</p>
            <ul className="flex flex-col gap-1.5 text-sm text-emerald-800 dark:text-emerald-300">
              <li>• Speak at a normal pace — not too fast, not too slow</li>
              <li>• Be in a quiet room with minimal background noise</li>
              <li>• Give complete answers — the AI follows up if it needs more detail</li>
              <li>• If Whisper misheard you, type a correction in the text box before sending</li>
            </ul>
          </div>

        </div>

        {/* Footer CTA */}
        <div className="sticky bottom-0 mt-6 border-t border-zinc-200 bg-zinc-50 pb-4 pt-4 dark:border-zinc-700 dark:bg-[#050505]">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReady}
              disabled={!canSkip}
              className="btn-primary w-full max-w-sm py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canSkip
                ? "I understand — Start Interview"
                : `Please read… (${ALLOW_SKIP_AFTER - (TOTAL_SECONDS - secondsLeft)}s)`}
            </button>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Interview starts automatically in {mins}:{secs.toString().padStart(2, "0")}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
