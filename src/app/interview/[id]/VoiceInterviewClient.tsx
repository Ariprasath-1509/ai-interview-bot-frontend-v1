"use client";

import { useEffect, useRef, useState } from "react";

type Utterance = { speaker: "BOT" | "CANDIDATE"; text: string; at: string };

type Props = {
  jdTitle: string;
  interviewId: string;
  rubricJson: string | null;
  candidateProfileJson: string | null;
  durationMinutes: number;
  interviewMode: string;
  onTranscriptChange: (json: string) => void;
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

function nowIso() {
  return new Date().toISOString();
}

/** Speak and resolve when playback finishes (or immediately if unsupported). */
function speakWhenDone(text: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    // Timeout: ~80ms per char + 5s buffer, prevents hang if onend never fires
    const timeoutMs = Math.max(text.length * 80, 4000) + 5000;
    const timer = setTimeout(done, timeoutMs);
    u.onend = () => { clearTimeout(timer); done(); };
    u.onerror = () => { clearTimeout(timer); done(); };
    synth.speak(u);
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

export function VoiceInterviewClient({ jdTitle, interviewId, rubricJson, candidateProfileJson, durationMinutes, interviewMode, onTranscriptChange }: Props) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;
    setSupported(true);
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
  const [timeExpired, setTimeExpired] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [manipulationCount, setManipulationCount] = useState(0);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const SPEECH_TIMEOUT_MS = 3000; // 3 seconds of silence before considering speech done
  const timerIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasBotQuestion = utterances.some(u => u.speaker === "BOT");
    if (hasBotQuestion && !timerStarted) {
      setTimerStarted(true);
      timerIntervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setTimeExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [utterances, timerStarted]);

  useEffect(() => () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); }, []);

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
    reason: "not_prepared" | "time_expired" | "ai_manipulation"
  ) {
    if (abandoning) return;
    setAbandoning(true);

    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    releaseMicStream();

    const transcriptJson = JSON.stringify({ utterances: currentUtterances });
    try {
      await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/abandon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptJson, reason }),
      });
    } catch (e) {
      // best effort
    }
    window.location.href = "/candidate/dashboard";
  }

  useEffect(() => {
    if (!timeExpired) return;
    const timeUpMessage: Utterance = {
      speaker: "BOT",
      text: `Your ${durationMinutes} minutes are up — we're stopping the interview here. Thank you for your time, your responses have been recorded.`,
      at: nowIso(),
    };
    const finalUtterances = [...utterancesRef.current, timeUpMessage];
    
    // Update utterances to include the time-up message
    syncUtterances(finalUtterances);
    
    // Stop the session but don't abandon - let user complete normally
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
    
    // Show time expired message and allow user to mark complete
    void speakWhenDone(timeUpMessage.text);
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
  /** User chose typed answers only (no Web Speech recognition). */
  const typedOnlyRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest “user left view” cleanup (avoids stale closures in document listeners). */
  const silentEndBecauseUserLeftRef = useRef<() => void>(() => {});

  async function fetchNextQuestion(args: {
    slot: number;
    lastAnswer: string;
    transcript: Utterance[];
    manipulationCount: number;
  }): Promise<{ question: string; manipulationDetected?: boolean; terminateInterview?: boolean; interviewComplete?: boolean } | null> {
    const MAX_RETRIES = 3;
    const BACKOFF_MS = [0, 1000, 2000];
    const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
      try {
        const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/next-question`, {
          method: "POST",
          headers: { "content-type": "application/json" },
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
        const data = (await res.json()) as { question?: string; manipulationDetected?: boolean; terminateInterview?: boolean; interviewComplete?: boolean };
        if (typeof data.question === "string") {
          return {
            question: data.question,
            manipulationDetected: data.manipulationDetected,
            terminateInterview: data.terminateInterview,
            interviewComplete: data.interviewComplete,
          };
        }
        return null;
      } catch (err) {
        console.warn(`[fetchNextQuestion] Attempt ${attempt + 1}/${MAX_RETRIES} network error:`, err);
        if (attempt < MAX_RETRIES - 1) continue;
        return null;
      }
    }
    return null;
  }

  useEffect(() => {
    utterancesRef.current = utterances;
  }, [utterances]);

  useEffect(() => {
    botPromptIdxRef.current = botPromptIdx;
  }, [botPromptIdx]);

  useEffect(() => {
    const transcript = {
      meta: { source: "web-speech", at: nowIso() },
      utterances,
    };
    onTranscriptChange(JSON.stringify(transcript, null, 2));
  }, [utterances, onTranscriptChange]);

  function syncUtterances(next: Utterance[]) {
    utterancesRef.current = next;
    setUtterances(next);
  }

  function releaseMicStream() {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
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

  async function ensureMicStream(): Promise<boolean> {
    releaseMicStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechError("This browser does not support getUserMedia. Use Chrome or Edge on desktop.");
      return false;
    }
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
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
    setMicPhase("idle");
  }

  async function addBot(text: string) {
    const row: Utterance = { speaker: "BOT", text, at: nowIso() };
    syncUtterances([...utterancesRef.current, row]);

    const rec = recognitionRef.current;
    if (rec && sessionActiveRef.current) {
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

    setMicPhase("bot_speaking");
    await speakWhenDone(text);

    pausedForTtsRef.current = false;
    if (sessionActiveRef.current) {
      setMicPhase("listening");
      if (typedOnlyRef.current) {
        return;
      }
      scheduleRecognitionStart("after tts");
    }
  }

  function scheduleRecognitionStart(reason: string) {
    void reason;
    if (typedOnlyRef.current) {
      if (sessionActiveRef.current) setMicPhase("listening");
      return;
    }
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    const rec = recognitionRef.current;
    if (!rec || !sessionActiveRef.current) return;

    const attempt = (delayMs: number) => {
      restartTimerRef.current = setTimeout(() => {
        try {
          rec.start();
          setMicPhase("listening");
        } catch {
          restartTimerRef.current = setTimeout(() => {
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
    if (!clean) return;

    const nextSlot = botPromptIdxRef.current + 1;
    const nextQ = await fetchNextQuestion({
      slot: nextSlot,
      lastAnswer: clean,
      transcript: utterancesRef.current,
      manipulationCount,
    });

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
    await addBot(q);
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
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    releaseMicStream();
    addCandidate(userLine);
    await playClosingLine(
      "Got it—we’ll wrap up here. Thanks for letting me know; you can press Mark complete below when you’re ready.",
    );
  }

  function flushSpokenAnswer() {
    const clean = finalBufferRef.current.trim();
    console.log('[Speech] Flushing answer:', clean.substring(0, 100) + (clean.length > 100 ? '...' : ''));
    
    if (!clean) {
      console.log('[Speech] No text to flush');
      return;
    }

    // Clear speech timeout when flushing
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    lastSpeechTimeRef.current = 0;

    if (isEndInterviewIntent(clean)) {
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
        const text = res?.[0]?.transcript ?? "";
        if (res?.isFinal) {
          finalBufferRef.current += text.trim() + " ";
          hasNewFinal = true;
        } else {
          interim += text;
        }
      }
      
      const trimmed = interim.trim();
      interimRef.current = trimmed;
      setInterimText(trimmed);
      
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
      if (sessionActiveRef.current && !pausedForTtsRef.current) {
        console.log('[Speech] Restarting after error:', err);
        scheduleRecognitionStart(`recover ${err ?? "error"}`);
      }
    };

    rec.onend = () => {
      if (pausedForTtsRef.current) {
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
    if (!text || !sessionActiveRef.current || micPhase !== "listening") return;
    setTypedDraft("");
    setSpeechError(null);
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
    if (!recognitionRef.current) return;
    setSpeechError(null);
    releaseMicStream();
    typedOnlyRef.current = true;
    setTypedAnswersOnly(true);
    sessionActiveRef.current = true;
    pausedForTtsRef.current = false;
    commitAfterEndRef.current = false;
    explicitStopRef.current = false;
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    attachRecognitionHandlers();

    if (utterancesRef.current.length === 0) {
      setMicPhase("bot_speaking");
      const nextQ = await fetchNextQuestion({ slot: 1, lastAnswer: "", transcript: [], manipulationCount });
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
      const row: Utterance = { speaker: "BOT", text: q, at: nowIso() };
      syncUtterances([...utterancesRef.current, row]);
      botPromptIdxRef.current = 1;
      setBotPromptIdx(1);
      await speakWhenDone(q);
      if (sessionActiveRef.current) {
        setMicPhase("listening");
      }
      return;
    }

    setMicPhase("listening");
  }

  async function start() {
    if (!recognitionRef.current) return;
    typedOnlyRef.current = false;
    setTypedAnswersOnly(false);
    setSpeechError(null);
    const micOk = await ensureMicStream();
    if (!micOk) {
      sessionActiveRef.current = false;
      setMicPhase("idle");
      return;
    }

    sessionActiveRef.current = true;
    pausedForTtsRef.current = false;
    commitAfterEndRef.current = false;
    explicitStopRef.current = false;
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterimText("");
    attachRecognitionHandlers();

    const rec = recognitionRef.current;

    if (utterancesRef.current.length === 0) {
      setMicPhase("bot_speaking");
      const nextQ = await fetchNextQuestion({ slot: 1, lastAnswer: "", transcript: [], manipulationCount });
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
      const row: Utterance = { speaker: "BOT", text: q, at: nowIso() };
      syncUtterances([...utterancesRef.current, row]);
      botPromptIdxRef.current = 1;
      setBotPromptIdx(1);
      await speakWhenDone(q);
      if (sessionActiveRef.current) {
        setMicPhase("listening");
        attachRecognitionHandlers();
        if (!typedOnlyRef.current) {
          scheduleRecognitionStart("open mic after intro");
        }
      }
      return;
    }

    try {
      rec.start();
      setMicPhase("listening");
    } catch {
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
    releaseMicStream();
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    window.speechSynthesis?.cancel();

    const rec = recognitionRef.current;
    if (!rec) {
      explicitStopRef.current = false;
      void playClosingLine(
        "Alright, stopping here. Thanks for your time—you can mark this interview complete below when you’re ready.",
      );
      return;
    }
    try {
      rec.stop();
    } catch {
      explicitStopRef.current = false;
      void playClosingLine(
        "Alright, stopping here. Thanks for your time—you can mark this interview complete below when you’re ready.",
      );
    }
  }

  silentEndBecauseUserLeftRef.current = () => {
    releaseMicStream();
    window.speechSynthesis?.cancel();
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
      if (document.visibilityState === "hidden") {
        silentEndBecauseUserLeftRef.current();
      }
    };
    const onPageHide = () => {
      silentEndBecauseUserLeftRef.current();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      silentEndBecauseUserLeftRef.current();
    };
  }, []);

  const listening = micPhase === "listening";
  const botSpeaking = micPhase === "bot_speaking";

  if (!supported) {
    return (
      <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Voice demo isn’t supported in this browser. Use Chrome/Edge on desktop (Web Speech API).
      </div>
    );
  }

  return (
    <div className="card p-4">
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="font-medium">Voice interview ({interviewMode})</div>
            {timerStarted && (
              <div className={`text-sm font-mono font-semibold px-3 py-0.5 rounded-full ${
                secondsLeft < 300
                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}>
                ⏱ {formatTime(secondsLeft)}
              </div>
            )}
            {timeExpired && (
              <div className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-sm font-semibold px-3 py-0.5 rounded-full">
                ⏰ Time's up!
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

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Mic pauses while bot speaks. Click <span className="font-medium text-zinc-700 dark:text-zinc-300">Send answer</span> after speaking, or say <span className="font-medium text-zinc-700 dark:text-zinc-300">stop the interview</span> to end.
        </p>

        <div className="flex flex-wrap gap-2">
          {micPhase === "idle" && !timeExpired ? (
            <>
              <button
                className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-all duration-200 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                type="button"
                onClick={() => void start()}
              >
                Start (mic)
              </button>
              <button
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                type="button"
                onClick={() => void startTypedOnly()}
              >
                Typed answers only
              </button>
            </>
          ) : timeExpired ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                ⏰ Time's up! Your interview has ended. Please click "Mark complete" below to submit your responses for assessment.
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

      <div className="mt-4 max-h-[320px] overflow-auto rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
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
        {listening && !typedAnswersOnly && interimText ? (
          <div className="mt-3 border-t border-zinc-200 pt-3 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">Heard (live):</span> {interimText}
            {finalBufferRef.current.trim() && (
              <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="font-medium">Captured:</span> {finalBufferRef.current.trim().substring(0, 100)}{finalBufferRef.current.trim().length > 100 ? '...' : ''}
              </div>
            )}
          </div>
        ) : listening && !typedAnswersOnly && !interimText && finalBufferRef.current.trim() ? (
          <div className="mt-3 border-t border-zinc-200 pt-3 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">Captured so far:</span> {finalBufferRef.current.trim().substring(0, 150)}{finalBufferRef.current.trim().length > 150 ? '...' : ''}
            <div className="mt-1 text-xs text-zinc-400">Continue speaking or click "Send answer" when done.</div>
          </div>
        ) : listening && !typedAnswersOnly && !interimText ? (
          <div className="mt-3 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-400">
            Waiting for speech… if this stays blank, use the typed box below or try another browser.
          </div>
        ) : null}
      </div>

      {listening && !timeExpired ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
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
          <button
            type="button"
            className="mt-2 rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-all duration-200 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            onClick={() => void submitTypedReply()}
          >
            Submit typed reply
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        {!timeExpired && (
          <>
            <p className="text-xs text-zinc-500">
              {typedAnswersOnly
                ? <><span className="font-medium">Submit typed reply</span> continues · <span className="font-medium">Stop session</span> ends</>
                : <><span className="font-medium">Send answer</span> finalizes mic · <span className="font-medium">Submit typed reply</span> uses text box · <span className="font-medium">Stop session</span> ends</>}
            </p>
            <button
              type="button"
              disabled={!listening || typedAnswersOnly}
              className="w-fit rounded-lg border border-zinc-200 px-4 py-2 text-sm transition-colors duration-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              onClick={() => {
                const rec = recognitionRef.current;
                if (!rec || !sessionActiveRef.current) return;
                // Stitch any live interim text into the final buffer NOW before stopping,
                // because Chrome with continuous=true rarely fires isFinal while mic is open.
                const pending = `${finalBufferRef.current.trim()} ${interimRef.current.trim()}`.trim();
                if (pending) {
                  finalBufferRef.current = pending + " ";
                  interimRef.current = "";
                  setInterimText("");
                }
                commitAfterEndRef.current = true;
                try {
                  rec.stop();
                } catch {
                  commitAfterEndRef.current = false;
                  flushSpokenAnswer();
                  if (sessionActiveRef.current) {
                    scheduleRecognitionStart("send answer sync fallback");
                  }
                }
              }}
            >
              Send answer (voice)
            </button>
          </>
        )}
        {timeExpired && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <span className="font-medium">Ready to submit:</span> Your interview responses have been recorded. Click "Mark complete" below to get your AI assessment and feedback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
