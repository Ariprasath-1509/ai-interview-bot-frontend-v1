'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFullscreenEnforcement } from '@/hooks/useFullscreenEnforcement';

interface QuestionView {
  id: string;
  type: 'MCQ' | 'SNIPPET' | 'LOGICAL' | 'PROFICIENCY';
  prompt: string;
  marks: number;
  options?: string[];
}

interface TestView {
  candidateName: string;
  candidateEmailMasked: string;
  language: string;
  deadline: string;
  questions: QuestionView[];
  logicalChoiceCount: number;
}

const cardCls = "max-w-3xl w-full bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800";
const inputCls = "w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
const textareaCls = inputCls + " min-h-[100px] font-mono text-sm";

interface Draft {
  confirmed: boolean;
  emailInput: string;
  answers: Record<string, string>;
  logicalIncluded: Record<string, boolean>;
}

const draftKey = (token: string) => `screening-draft-${token}`;

function loadDraft(token: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(token));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(token: string, draft: Draft) {
  try {
    localStorage.setItem(draftKey(token), JSON.stringify(draft));
  } catch {
    // Ignore — e.g. private browsing with storage disabled. Answers just won't survive a reload.
  }
}

function clearDraft(token: string) {
  try {
    localStorage.removeItem(draftKey(token));
  } catch {
    // Ignore
  }
}

export default function ScreeningTestPage() {
  const params = useParams();
  const token = params.token as string;

  const [test, setTest] = useState<TestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [logicalIncluded, setLogicalIncluded] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Restore any in-progress answers from this browser if the page was reloaded mid-test.
  useEffect(() => {
    const draft = loadDraft(token);
    if (draft) {
      setConfirmed(draft.confirmed);
      setEmailInput(draft.emailInput);
      setAnswers(draft.answers);
      setLogicalIncluded(draft.logicalIncluded);
    }
    setHydrated(true);
  }, [token]);

  // Keep the draft up to date as the candidate types — only after the initial restore above,
  // so we don't overwrite a saved draft with blank initial state before it's loaded.
  useEffect(() => {
    if (!hydrated) return;
    saveDraft(token, { confirmed, emailInput, answers, logicalIncluded });
  }, [hydrated, token, confirmed, emailInput, answers, logicalIncluded]);

  useEffect(() => {
    fetch(`/api/screening/public/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'This test link is invalid or has expired');
          return;
        }
        setTest(data);
      })
      .catch(() => setError('Failed to load test'))
      .finally(() => setLoading(false));
  }, [token]);

  // Proctoring: once the candidate confirms and starts, require fullscreen and flag tab switches.
  // One violation (fullscreen exit or tab switch) shows a warning; a second pauses the test — the
  // candidate can only resume on this same link once a recruiter/admin explicitly permits it.
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [violationWarning, setViolationWarning] = useState('');
  const [locked, setLocked] = useState(false);
  const tabSwitchCountRef = useRef(0);
  const lastViolationAtRef = useRef(0);
  const lockTriggeredRef = useRef(false);

  const proctoringActive = confirmed && !!test && !submitted && !locked;

  const lockTest = useCallback(async () => {
    try {
      await fetch(`/api/screening/public/${token}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabSwitchCount: tabSwitchCountRef.current }),
      });
    } catch {
      // Best-effort — the draft stays in localStorage either way, so nothing is lost once unlocked.
    } finally {
      setLocked(true);
    }
  }, [token]);

  const registerViolation = useCallback((source: 'fullscreen' | 'tab') => {
    const now = Date.now();
    // A single real tab-switch often fires both a visibilitychange and a fullscreenchange exit
    // near-simultaneously — debounce so it only counts as one violation.
    if (now - lastViolationAtRef.current < 1000) return;
    lastViolationAtRef.current = now;
    const next = tabSwitchCountRef.current + 1;
    tabSwitchCountRef.current = next;
    setTabSwitchCount(next);

    if (next >= 2) {
      setViolationWarning('Multiple violations detected — your test has been paused.');
      if (!lockTriggeredRef.current) {
        lockTriggeredRef.current = true;
        lockTest();
      }
    } else {
      setViolationWarning(
        source === 'fullscreen'
          ? 'You exited fullscreen. One more tab switch or fullscreen exit will pause your test.'
          : 'Tab switch detected. One more tab switch or fullscreen exit will pause your test.'
      );
    }
  }, [lockTest]);

  const { isFullscreen, requestFullscreen } = useFullscreenEnforcement({
    active: proctoringActive,
    onExit: () => registerViolation('fullscreen'),
  });

  useEffect(() => {
    if (!proctoringActive) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') registerViolation('tab');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [proctoringActive, registerViolation]);

  useEffect(() => {
    if (!proctoringActive) return;
    const blockClipboard = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    return () => {
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
    };
  }, [proctoringActive]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Unable to open test</h2>
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="text-xl font-bold">✓</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Test submitted</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Thanks, {test.candidateName}. Your answers have been recorded. The team that invited you will be in touch
            with next steps.
          </p>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Test paused</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Your test was paused after a proctoring violation (leaving fullscreen or switching tabs). Please contact
            your recruiter or admin — once they permit you to continue, reload this page to pick up where you left off.
          </p>
        </div>
      </div>
    );
  }

  if (!confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] p-4">
        <div className={cardCls}>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {test.language} Screening Test
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Hi {test.candidateName}, this invite was sent to <strong>{test.candidateEmailMasked}</strong>. Please
            confirm your full email address to start — this link is single-use and personal to you.
          </p>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 list-disc list-inside space-y-1 mb-6">
            <li>10 multiple-choice questions (1 mark each)</li>
            <li>10 code-snippet questions (1 mark each)</li>
            <li>4 logical/programming questions — answer exactly 2 (5 marks each), plain text, no code editor</li>
            <li>1 short written question, scored for English proficiency (5 marks)</li>
          </ul>
          <input
            type="email"
            className={inputCls}
            placeholder="Enter your email to confirm"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            disabled={!emailInput.trim()}
            onClick={() => setConfirmed(true)}
          >
            Start test
          </button>
        </div>
      </div>
    );
  }

  const logicalQuestions = test.questions.filter((q) => q.type === 'LOGICAL');
  const includedLogicalCount = logicalQuestions.filter((q) => logicalIncluded[q.id]).length;
  // Blocks all answer interaction until the candidate returns to fullscreen — cleared the instant they do.
  const outOfFullscreen = !!violationWarning && !isFullscreen;

  const handleSubmit = async () => {
    setSubmitError('');
    if (includedLogicalCount !== test.logicalChoiceCount) {
      setSubmitError(`Please choose exactly ${test.logicalChoiceCount} of the ${logicalQuestions.length} logical questions to answer.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        candidateEmailConfirmation: emailInput.trim(),
        answers: test.questions
          .filter((q) => q.type !== 'LOGICAL' || logicalIncluded[q.id])
          .map((q) => ({ questionId: q.id, rawAnswer: answers[q.id] || '' })),
        tabSwitchCount: tabSwitchCountRef.current,
      };
      const res = await fetch(`/api/screening/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit — please try again');
        return;
      }
      clearDraft(token);
      setSubmitted(true);
    } catch {
      setSubmitError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className={cardCls}>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{test.language} Screening Test</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Answer every question except the 2 logical questions you choose to skip. Submit once — this link cannot be reopened afterward.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            This test runs in fullscreen. Leaving fullscreen or switching tabs is tracked — a second violation
            pauses your test until a recruiter or admin permits you to continue. Copy/paste is disabled.
          </p>
        </div>

        {outOfFullscreen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-950 rounded-2xl border border-red-300 dark:border-red-800 p-6 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <span className="text-xl font-bold">!</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Proctoring violation</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{violationWarning}</p>
              <button
                type="button"
                onClick={async () => {
                  if (await requestFullscreen()) setViolationWarning('');
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Return to fullscreen
              </button>
            </div>
          </div>
        )}

        {test.questions.map((q, idx) => {
          if (q.type === 'LOGICAL') {
            const included = !!logicalIncluded[q.id];
            const disabled = !included && includedLogicalCount >= test.logicalChoiceCount;
            return (
              <div key={q.id} className={cardCls}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Q{idx + 1} · Logical/Programming · {q.marks} marks
                  </span>
                  <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={included}
                      disabled={disabled || outOfFullscreen}
                      onChange={(e) =>
                        setLogicalIncluded((prev) => ({ ...prev, [q.id]: e.target.checked }))
                      }
                    />
                    Answer this one
                  </label>
                </div>
                <p className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-100 mb-3">{q.prompt}</p>
                <textarea
                  className={textareaCls}
                  placeholder="Write pseudocode or full code — plain text, no editor required."
                  disabled={!included || outOfFullscreen}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              </div>
            );
          }

          return (
            <div key={q.id} className={cardCls}>
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Q{idx + 1} · {q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'SNIPPET' ? 'Code Snippet' : 'Proficiency'} · {q.marks} mark{q.marks > 1 ? 's' : ''}
              </span>
              <p className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-100 mt-2 mb-3">{q.prompt}</p>

              {q.type === 'MCQ' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        disabled={outOfFullscreen}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className={textareaCls}
                  placeholder="Type your answer here..."
                  disabled={outOfFullscreen}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              )}
            </div>
          );
        })}

        <div className={cardCls}>
          {submitError && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{submitError}</p>}
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            disabled={submitting || outOfFullscreen}
            onClick={() => handleSubmit()}
          >
            {submitting ? 'Submitting…' : outOfFullscreen ? 'Return to fullscreen to continue' : 'Submit test'}
          </button>
        </div>
      </div>
    </div>
  );
}
