"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

interface Props {
  interviewId: string;
}

export function MentorReportPanel({ interviewId }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/mentor-report/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to generate mentor report.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? "Mentor_Report.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50/40 p-5 shadow-sm dark:border-teal-800/50 dark:bg-teal-950/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
            <FileText className="h-4 w-4 text-teal-700 dark:text-teal-300" />
          </span>
          <div>
            <p className="font-semibold text-teal-900 dark:text-teal-100">Mentor Report</p>
            <p className="mt-0.5 text-sm text-teal-700/80 dark:text-teal-300/70">
              Honest, detailed, actionable feedback for the candidate&apos;s mentor or coach.
              Includes skill scores, growth areas, behavioral signals, resume gaps, and a study roadmap.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading ? "Generating…" : "Download PDF"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
