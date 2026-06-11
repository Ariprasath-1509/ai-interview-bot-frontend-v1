"use client";

import { formatProctorEventType, integrityLabel } from "@/lib/proctoring/scoring";
import { integrityModeLabel, type ProctoringMode } from "@/lib/proctoring/mode";

type ProctorEventRow = {
  at?: string;
  type?: string;
  severity?: string;
  reasons?: string[];
  confidence?: number;
};

type ProctorSnapshot = {
  at?: string;
  eventType?: string;
  fileName?: string;
  bytes?: number;
};

type LightIntegrity = {
  tabSwitchCount?: number;
  tabSwitchViolation?: boolean;
  fullscreenExitCount?: number;
  proctoringMode?: string;
  candidateSource?: string;
};

type ProctoringTimeline = {
  interviewId: string;
  integrityScore?: number | null;
  events?: ProctorEventRow[];
  strikes?: Record<string, number>;
  status?: string;
  snapshots?: ProctorSnapshot[];
  updatedAt?: string | null;
  proctoringMode?: ProctoringMode | string;
  candidateSource?: string | null;
  lightIntegrity?: LightIntegrity | null;
};

function scoreBadgeClass(tone: "good" | "warn" | "bad"): string {
  if (tone === "good") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
  if (tone === "warn") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
}

function LightIntegrityPanel({ light, candidateSource }: { light: LightIntegrity; candidateSource?: string | null }) {
  const tabSwitches = light.tabSwitchCount ?? 0;
  const fullscreenExits = light.fullscreenExitCount ?? 0;
  const violated = Boolean(light.tabSwitchViolation);

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This candidate ({candidateSource ?? light.candidateSource ?? "BENCH/B2B"}) was monitored with{" "}
        <span className="font-medium">light integrity mode</span> — fullscreen enforcement and tab-switch detection only.
        No camera proctoring was required or recorded.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{tabSwitches}</div>
          <div className="text-xs text-zinc-500">Tab switches</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{fullscreenExits}</div>
          <div className="text-xs text-zinc-500">Fullscreen exits</div>
        </div>
        <div
          className={`rounded-lg border p-3 ${
            violated
              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
              : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          }`}
        >
          <div className={`text-sm font-semibold ${violated ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
            {violated ? "Tab switch violation" : "No tab violation"}
          </div>
          <div className="text-xs text-zinc-500">Max 2 switches allowed</div>
        </div>
      </div>
    </div>
  );
}

export function ProctoringTimelinePanel({
  interviewId,
  timeline,
}: {
  interviewId: string;
  timeline: ProctoringTimeline | null;
}) {
  const mode: ProctoringMode =
    timeline?.proctoringMode === "video" || timeline?.proctoringMode === "light"
      ? timeline.proctoringMode
      : "video";
  const isLightMode = mode === "light" || timeline?.status === "LIGHT_INTEGRITY";

  if (!timeline) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Interview integrity</h3>
        <p className="mt-2 text-sm text-zinc-500">No integrity data recorded for this interview.</p>
      </div>
    );
  }

  if (isLightMode) {
    const light = timeline.lightIntegrity ?? {};
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Interview integrity (light mode)</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {integrityModeLabel("light")}
              {timeline.candidateSource ? ` · ${timeline.candidateSource}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            Light monitoring
          </span>
        </div>
        <LightIntegrityPanel light={light} candidateSource={timeline.candidateSource} />
      </div>
    );
  }

  const events = timeline.events ?? [];
  const snapshots = timeline.snapshots ?? [];
  const score = timeline.integrityScore ?? null;
  const scoreMeta = score != null ? integrityLabel(score) : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Video proctoring</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {integrityModeLabel("video")}
            {timeline.candidateSource ? ` · ${timeline.candidateSource}` : ""}
            {" · "}Status: {timeline.status?.replace(/_/g, " ") ?? "Unknown"}
            {timeline.updatedAt ? ` · updated ${new Date(timeline.updatedAt).toLocaleString()}` : ""}
          </p>
        </div>
        {score != null && scoreMeta && (
          <div className="text-right">
            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${scoreBadgeClass(scoreMeta.tone)}`}>
              {scoreMeta.label}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{score}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-400">Integrity score</div>
          </div>
        )}
      </div>

      {timeline.strikes && Object.keys(timeline.strikes).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(timeline.strikes)
            .filter(([, count]) => count > 0)
            .map(([type, count]) => (
              <span
                key={type}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {formatProctorEventType(type)}: {count}
              </span>
            ))}
        </div>
      )}

      {events.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 pr-4 font-medium">Severity</th>
                <th className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <tr key={`${event.at}-${event.type}-${idx}`} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 pr-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {event.at ? new Date(event.at).toLocaleTimeString() : "—"}
                  </td>
                  <td className="py-2 pr-4 font-medium text-zinc-800 dark:text-zinc-100">
                    {formatProctorEventType(event.type ?? "unknown")}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded px-1.5 py-0.5 font-semibold uppercase ${
                        event.severity === "hard"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {event.severity ?? "soft"}
                    </span>
                  </td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">
                    {(event.reasons ?? []).join("; ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No violation events recorded.</p>
      )}

      {snapshots.length > 0 && (
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Violation snapshots</h4>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {snapshots.map((snap) => (
              <a
                key={snap.fileName}
                href={`/api/interviews/${encodeURIComponent(interviewId)}/proctoring/snapshots/${encodeURIComponent(snap.fileName ?? "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/interviews/${encodeURIComponent(interviewId)}/proctoring/snapshots/${encodeURIComponent(snap.fileName ?? "")}`}
                  alt={snap.eventType ?? "Violation snapshot"}
                  className="aspect-[4/3] w-full object-cover transition-opacity group-hover:opacity-90"
                />
                <div className="bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {formatProctorEventType(snap.eventType ?? "violation")}
                  {snap.at ? ` · ${new Date(snap.at).toLocaleTimeString()}` : ""}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
