"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

const POLL_MS = 5000;
const MAX_POLLS = 150; // ~12.5 minutes

export function RerunAssessmentButton({ interviewId }: { interviewId: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const pollStatus = async (runId: string | null) => {
    const qs = runId ? `?runId=${encodeURIComponent(runId)}` : "";
    const statusRes = await fetch(`/api/interviews/${interviewId}/reassess/status${qs}`, {
      credentials: "include",
    });
    return statusRes.json().catch(() => ({}));
  };

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

      const runId: string | null = startData.runId ?? null;
      setProgress("Assessment queued — waiting for AI (this usually takes 5–10 min)…");

      for (let i = 0; i < MAX_POLLS; i++) {
        if (i > 0) {
          await sleep(POLL_MS);
        }

        const elapsedMin = Math.round((i * POLL_MS) / 60000);
        setProgress(
          elapsedMin > 0
            ? `Running AI assessment… (${elapsedMin} min elapsed)`
            : "Running AI assessment…"
        );

        const statusData = await pollStatus(runId);

        if (statusData.status === "FAILED") {
          setError(statusData.error || "Assessment failed");
          return;
        }

        if (statusData.status === "COMPLETED") {
          if (runId && statusData.runId && statusData.runId !== runId) {
            continue;
          }

          setProgress("Saving results…");
          const applyRes = await fetch(`/api/interviews/${interviewId}/reassess/status`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId }),
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

      setError(
        "Assessment is taking longer than expected. Refresh the page in a few minutes — " +
          "if it completed, use the review page to confirm results."
      );
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
