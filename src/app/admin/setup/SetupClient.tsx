"use client";

import { useState, useEffect } from 'react';
import { CandidateSearch } from './CandidateSearch';
import { PositionSearch } from './PositionSearch';

import { INTERVIEW_MODES, DURATION_OPTIONS } from '@/lib/constants';

export default function InterviewSetupClient() {
  const [formData, setFormData] = useState({
    engineerEmail: '',
    engineerName: '',
    jdTitle: '',
    jdText: '',
    focusAreas: '',
    resumeSummary: '',
    interviewMode: 'SCREENING',
    customDurationMinutes: null as number | null,
    positionId: null as number | null
  });

  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [autoFillMode, setAutoFillMode] = useState(false);

  const selectedMode = INTERVIEW_MODES.find(mode => mode.value === formData.interviewMode);
  const defaultDuration = selectedMode?.defaultDuration || 15;

  const handleModeChange = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      interviewMode: mode,
      customDurationMinutes: null // Reset custom duration when mode changes
    }));
  };

  const onCandidateSelect = (candidate: { name: string; email: string }) => {
    setFormData(prev => ({
      ...prev,
      engineerEmail: candidate.email,
      engineerName: candidate.name
    }));
    setLocked(true);
  };

  const onCandidateClear = () => {
    setFormData(prev => ({
      ...prev,
      engineerEmail: '',
      engineerName: ''
    }));
    setLocked(false);
  };

  const onPositionSelect = async (position: { id: number; title: string; description: string; requiredSkills: string[]; experienceLevel: string }) => {
    setFormData(prev => ({
      ...prev,
      jdTitle: position.title,
      jdText: position.description,
      focusAreas: position.requiredSkills.join(', '),
      positionId: position.id,
      interviewMode: getRecommendedMode(position.experienceLevel)
    }));
    setAutoFillMode(true);
  };

  const onPositionClear = () => {
    setFormData(prev => ({
      ...prev,
      jdTitle: '',
      jdText: '',
      focusAreas: '',
      positionId: null,
      interviewMode: 'SCREENING'
    }));
    setAutoFillMode(false);
  };

  const getRecommendedMode = (experienceLevel: string): string => {
    switch (experienceLevel) {
      case 'JUNIOR': return 'SCREENING';
      case 'MID': return 'L1';
      case 'SENIOR': return 'L2';
      case 'LEAD': return 'L3';
      default: return 'SCREENING';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const limitCheck = await fetch('/api/tokens/check-limit');
      const limitData = await limitCheck.json();

      if (!limitData.canProceed) {
        alert(`Daily token limit reached (${limitData.usage}/${limitData.limit} tokens used). Try again tomorrow.`);
        setPending(false);
        return;
      }

      if (limitData.nearLimit) {
        const proceed = confirm(`Warning: Approaching daily limit (${limitData.usage}/${limitData.limit} tokens used). Continue?`);
        if (!proceed) { setPending(false); return; }
      }

      const payload = { 
        ...formData, 
        customDurationMinutes: formData.customDurationMinutes || undefined,
        positionId: formData.positionId || undefined
      };

      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = `/admin/setup?created=${data.id}`;
      } else {
        const error = await response.text();
        alert(`Failed to create interview: ${error}`);
        setPending(false);
      }
    } catch {
      alert('Error creating interview');
      setPending(false);
    }
  };

  const inputCls = "w-full p-3 border rounded-lg bg-white dark:bg-black dark:border-zinc-800 text-zinc-900 dark:text-zinc-100";
  const lockedCls = `${inputCls} opacity-60 cursor-not-allowed`;

  return (
    <div className="w-full p-6 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Position Search for Auto-fill */}
        <PositionSearch onSelect={onPositionSelect} onClear={onPositionClear} />
        
        {/* Candidate Search */}
        <CandidateSearch onSelect={onCandidateSelect} onClear={onCandidateClear} />
        
        <div className="grid gap-2">
          <label className="text-sm font-medium">Engineer email</label>
          <input
            className={locked ? lockedCls : inputCls}
            type="email" required
            value={formData.engineerEmail}
            readOnly={locked}
            onChange={(e) => setFormData(p => ({...p, engineerEmail: e.target.value}))}
            placeholder="engineer@company.com - Used for interview invitation and login"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Engineer name</label>
          <input
            className={locked ? lockedCls : inputCls}
            type="text"
            value={formData.engineerName}
            readOnly={locked}
            onChange={(e) => setFormData(p => ({...p, engineerName: e.target.value}))}
            placeholder="John Doe - Displayed in interview dashboard and reports"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">JD title {autoFillMode && <span className="text-green-600">(Auto-filled)</span>}</label>
          <input
            className={inputCls}
            type="text" required
            value={formData.jdTitle}
            onChange={(e) => setFormData(p => ({...p, jdTitle: e.target.value}))}
            placeholder="Senior Backend Engineer - Used for AI question generation and evaluation"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">JD text {autoFillMode && <span className="text-green-600">(Auto-filled)</span>}</label>
          <textarea
            className={`${inputCls} min-h-[120px]`}
            required
            value={formData.jdText}
            onChange={(e) => setFormData(p => ({...p, jdText: e.target.value}))}
            placeholder="Paste the complete job description here..."
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Special focus areas (optional) {autoFillMode && <span className="text-green-600">(Auto-filled)</span>}</label>
          <input
            className={inputCls}
            type="text"
            value={formData.focusAreas}
            onChange={(e) => setFormData(p => ({...p, focusAreas: e.target.value}))}
            placeholder='e.g., "Kafka, microservices, system design" - AI will emphasize these topics during interview'
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Resume summary (required)</label>
          <textarea
            className={`${inputCls} min-h-[120px]`}
            required
            value={formData.resumeSummary}
            onChange={(e) => setFormData(p => ({...p, resumeSummary: e.target.value}))}
            placeholder="Paste candidate's resume summary or key experience points here... AI uses this to: 1) Calibrate question difficulty to their level, 2) Ask personalized follow-ups about their experience, 3) Check consistency between claimed vs demonstrated skills in final assessment."
          />
        </div>

        {/* Interview Mode Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Interview Mode {autoFillMode && <span className="text-green-600">(Recommended)</span>}</label>
          <select
            value={formData.interviewMode}
            onChange={(e) => handleModeChange(e.target.value)}
            className={inputCls}
          >
            {INTERVIEW_MODES.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label} - {mode.description} ({mode.questions}q, {mode.defaultDuration}min, {mode.difficulty})
              </option>
            ))}
          </select>
          <p className="text-sm text-zinc-500 mt-1">
            {autoFillMode ? 'Recommended based on position experience level' : `Default: ${selectedMode?.questions} questions in ${defaultDuration} minutes (${selectedMode?.difficulty} difficulty)`}
          </p>
        </div>

        {/* Duration Override */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Custom Duration (Optional)
          </label>
          <select
            value={formData.customDurationMinutes || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              customDurationMinutes: e.target.value ? parseInt(e.target.value) : null
            }))}
            className={inputCls}
          >
            <option value="">Use default ({defaultDuration} minutes)</option>
            {DURATION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-zinc-500 mt-1">
            Override the default duration for this interview
          </p>
        </div>
        
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {pending ? "Creating…" : "Create Interview"}
        </button>
      </form>
    </div>
  );
}
