"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

const POLL_MS = 5000;
const MAX_POLLS = 120; // ~10 minutes

export function RerunAssessmentButton({ interviewId }: { interviewId: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleRerun = async () => {
    if (
      !confirm(
        "This will re-run the AI assessment using the stored transcript. " +
          "With Ollama this often takes 5–10 minutes. You can stay on this page while it runs. Continue?"
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setProgress("Starting assessment…");

    try {
      const startRes = await fetch(`/api/interviews/${interviewId}/reassess`, { method: "POST" });
      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok) {
        setError(startData.error || "Failed to start assessment");
        return;
      }

      for (let i = 0; i < MAX_POLLS; i++) {
        setProgress(`Running AI assessment… (${Math.round(((i + 1) * POLL_MS) / 60000)} min elapsed)`);
        await sleep(POLL_MS);

        const statusRes = await fetch(`/api/interviews/${interviewId}/reassess/status`, {
          credentials: "include",
        });
        const statusData = await statusRes.json().catch(() => ({}));

        if (statusData.status === "FAILED") {
          setError(statusData.error || "Assessment failed");
          return;
        }

        if (statusData.status === "COMPLETED") {
          setProgress("Saving results…");
          const applyRes = await fetch(`/api/interviews/${interviewId}/reassess/status`, {
            method: "POST",
            credentials: "include",
          });
          const applyData = await applyRes.json().catch(() => ({}));
          if (!applyRes.ok) {
            setError(applyData.error || "Failed to save assessment results");
            return;
          }
          window.location.reload();
          return;
        }
      }

      setError("Assessment is taking longer than expected. Refresh the page in a few minutes — results may already be saved.");
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div>
      <button
        onClick={handleRerun}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/40"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Re-assessing…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Re-run Assessment
          </>
        )}
      </button>
      {progress && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{progress}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
