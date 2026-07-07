'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
        </div>

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
                      disabled={disabled}
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
                  disabled={!included}
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
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit test'}
          </button>
        </div>
      </div>
    </div>
  );
}
