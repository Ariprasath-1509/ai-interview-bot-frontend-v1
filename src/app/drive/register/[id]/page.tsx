'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Drive {
  id: string;
  title: string;
  description: string;
  batchName: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPositions: number;
}

export default function RegisterPage() {
  const params = useParams();
  const driveId = params.id as string;

  const [drive, setDrive] = useState<Drive | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    resumeUrl: ''
  });

  useEffect(() => {
    fetchDrive();
  }, [driveId]);

  const fetchDrive = async () => {
    try {
      const response = await fetch(`/api/drives/${driveId}`);
      if (response.ok) {
        const data = await response.json();
        setDrive(data);
      } else {
        setError('Drive not found');
      }
    } catch (err) {
      setError('Failed to load drive details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/drives/${driveId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error && !drive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Drive not found</h2>
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (drive?.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="text-sm font-semibold">Closed</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Registration closed</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            This drive is currently {drive?.status.toLowerCase()}. Registration is only available for active drives.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="text-xl font-bold">✓</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Registration successful</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Thank you for registering for <strong>{drive.title}</strong>. 
            You will receive further instructions via email at <strong>{formData.candidateEmail}</strong>.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900 text-left">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Next Steps:</h3>
            <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Check your email for assessment link</li>
              <li>Complete Round 1 (MCQ + Coding)</li>
              <li>Await results and Round 2 invitation</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] py-12 px-4">
      {/* Background Effects */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-600/15" />
      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/4 rounded-full bg-sky-500/10 blur-[100px] dark:bg-sky-600/15" />

      <div className="max-w-2xl mx-auto">
        {/* Drive Info */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{drive.title}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">{drive.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">Batch</div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{drive.batchName}</div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">Positions</div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{drive.totalPositions}</div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">Deadline</div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {new Date(drive.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Register for Drive</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.candidateName}
                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                className={inputCls}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.candidateEmail}
                onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                className={inputCls}
                placeholder="john@example.com"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Assessment link will be sent to this email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.candidatePhone}
                onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                className={inputCls}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Resume URL (Optional)
              </label>
              <input
                type="url"
                value={formData.resumeUrl}
                onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                className={inputCls}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Link to your resume (Google Drive, Dropbox, etc.)
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors"
            >
              {submitting ? 'Registering...' : 'Register Now'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-sm">Selection Process:</h3>
            <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-decimal list-inside">
              <li>Round 1: MCQ + Code Snippets + Programming (Online)</li>
              <li>Round 2: AI Voice Technical Interview (15-30 mins)</li>
              <li>Round 3: Face-to-Face Managerial Interview</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
