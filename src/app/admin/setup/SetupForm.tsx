"use client";

import { useRef, useState, useTransition } from "react";
import { CandidateSearch } from "./CandidateSearch";

export function SetupForm({
  createAssessment,
}: {
  createAssessment: (formData: FormData) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [locked, setLocked] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSelect(c: { name: string; email: string }) {
    setEmail(c.email);
    setName(c.name);
    setLocked(true);
  }

  function onClear() {
    setEmail("");
    setName("");
    setLocked(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => { void createAssessment(formData); });
  }

  const inputCls = "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100";
  const lockedCls = `${inputCls} opacity-60 cursor-not-allowed`;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
      <CandidateSearch onSelect={onSelect} onClear={onClear} />

      <div className="grid gap-2">
        <label className="text-sm font-medium">Engineer email</label>
        <input
          className={locked ? lockedCls : inputCls}
          name="engineerEmail" type="email" required
          placeholder="engineer@company.com"
          value={email}
          readOnly={locked}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Engineer name (optional)</label>
        <input
          className={locked ? lockedCls : inputCls}
          name="engineerName" type="text"
          placeholder="Name"
          value={name}
          readOnly={locked}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">JD title</label>
        <input className={inputCls} name="jdTitle" type="text" required placeholder="Senior Backend Engineer" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">JD text (paste)</label>
        <textarea
          className={`min-h-[220px] ${inputCls}`}
          name="jdText" required placeholder="Paste job description here…"
        />
        <p className="text-xs text-zinc-500">Minimum 50 characters.</p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Special focus areas (optional)</label>
        <input className={inputCls} name="focusAreas" type="text" placeholder='e.g., "event-driven systems, Kafka"' />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Resume / experience summary (required, for AI)</label>
        <textarea
          className={`min-h-[120px] ${inputCls}`}
          name="resumeSummary"
          required
          onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity("Resume summary is required for accurate evaluation")}
          onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity("")}
          placeholder="Paste a short resume summary or key bullets—used for human-like follow-ups and post-interview AI scoring against the JD."
        />
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-200"
        >
          {pending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {pending ? "Creating…" : "Create interview"}
        </button>
      </div>
    </form>
  );
}
