"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

export function RerunAssessmentButton({ interviewId }: { interviewId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRerun = async () => {
    if (!confirm("This will re-run the AI assessment using the stored transcript. This may take 30-60 seconds. Continue?")) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/interviews/${interviewId}/reassess`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        setError(data.error || "Assessment failed");
        return;
      }
      // Reload the page to show updated scores
      window.location.reload();
    } catch (e) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
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
            Re-assessing...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Re-run Assessment
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
