import { isStaffReadRole, isStaffAdminRole } from '@/lib/staffRoles';
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { TranscriptView } from "./TranscriptView";
import { ReviewPageScrollReset } from "./ReviewPageScrollReset";
import { ProctoringTimelinePanel } from "./ProctoringTimelinePanel";
import { RerunAssessmentButton } from "./RerunAssessmentButton";
import { ClientBriefPanel } from "./ClientBriefPanel";
import { AppShell } from "@/app/components/AppShell";
import { AssessmentBanners } from "@/app/interview/AssessmentBanners";
import {
  buildAssessmentBanners,
  mergeAssessmentScores,
  parseAiAssessment,
  inferAssessmentScoreMax,
  type ScoreRow,
} from "@/app/interview/assessmentUtils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SignOffSchema = z.object({
  interviewId: z.string().min(1),
  verdict: z.enum(["READY", "NEEDS_1_WEEK_PREP", "NEEDS_RESKILLING", "MISMATCH_WITH_JD"]),
  note: z.string().min(1),
});

type Score = ScoreRow & { id: string };
type Interview = {
  id: string;
  status: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
  transcriptJson: string | null;
  recordingPath?: string | null;
};

function parseTranscript(transcriptJson: string | null): { speaker: string; text: string; at: string }[] {
  if (!transcriptJson) return [];
  try {
    const doc = JSON.parse(transcriptJson) as { utterances?: { speaker: string; text: string; at: string }[] };
    return Array.isArray(doc.utterances) ? doc.utterances : [];
  } catch { return []; }
}

function parseCodeSubmissions(transcriptJson: string | null): Record<string, unknown>[] {
  if (!transcriptJson) return [];
  try {
    const doc = JSON.parse(transcriptJson) as { meta?: { codeSubmissions?: unknown; codeSubmission?: unknown } };
    if (Array.isArray(doc.meta?.codeSubmissions)) {
      return doc.meta.codeSubmissions as Record<string, unknown>[];
    }
    if (doc.meta?.codeSubmission) {
      return [doc.meta.codeSubmission as Record<string, unknown>];
    }
    return [];
  } catch { return []; }
}

type SignOff = { signedOff: boolean; finalVerdict?: string; note?: string; signedOffAt?: string };

function cleanText(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/Heuristic only \(no (OPENAI_API_KEY|CLAUDE_API_KEY)\):\s*/gi, "")
    .replace(/Heuristic only:\s*/gi, "")
    .replace(/Automatic AI assessment was not available\. Add (OPENAI_API_KEY|CLAUDE_API_KEY).*$/gi, "Preliminary assessment based on dialogue depth.")
    .replace(/Configure (OPENAI_API_KEY|CLAUDE_API_KEY) for real assessment\./gi, "")
    .replace(/Re-run with API key for JD\/resume-grounded scoring\./gi, "")
    .replace(/score scales lightly with length of candidate replies/gi, "Score based on response depth and detail.")
    .replace(/score scales with candidate word count/gi, "Score based on response depth and detail.")
    .replace(/based on number of candidate turns/gi, "Score based on dialogue engagement and clarity of turns.")
    .replace(/Enable (OpenAI|Claude) for evidence-based scoring against JD and resume\./gi, "Full JD alignment assessment is pending further technical review.")
    .trim();
}

function normalizeFeedbackItemList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

export default async function InterviewReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = await searchParams;
  const signedOff = sp.signedOff === "1";
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const session = await getSession();

  const [interviewRes, scoresRes, summaryRes, signOffRes, slotQuestionsRes, proctoringRes] = await Promise.all([
    apiServer(`/interviews/${id}`, session?.token),
    apiServer(`/scores/${id}`, session?.token),
    apiServer(`/interviews/summary`, session?.token),
    apiServer(`/reviews/${id}`, session?.token),
    apiServer(`/interviews/${id}/questions`, session?.token),
    apiServer(`/interviews/${id}/proctoring/timeline`, session?.token),
  ]);

  if (!interviewRes.ok) return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const interview = (await interviewRes.json()) as Interview;
  let scores: Score[] = [];
  try { if (scoresRes.ok) scores = await scoresRes.json(); } catch {}
  const summaries: { id: string; candidateName: string; candidateEmail: string; jdTitle: string }[] =
    summaryRes?.ok ? await summaryRes.json().catch(() => []) : [];
  const summary = summaries.find((s) => s.id === id);
  let existingSignOff: SignOff = { signedOff: false };
  try { if (signOffRes?.ok) existingSignOff = await signOffRes.json(); } catch {}
  const ai = parseAiAssessment(interview.transcriptJson);
  const utterances = parseTranscript(interview.transcriptJson);
  const speech = ai?.speechAnalytics ?? null;
  const codeSubmissions = parseCodeSubmissions(interview.transcriptJson);
  const assessFailed = Boolean((ai as { assessFailed?: boolean } | null)?.assessFailed);
  type SlotQuestion = {
    slotNumber: number;
    questionText: string;
    candidateAnswer?: string | null;
    questionType?: string | null;
    source?: string | null;
  };
  let slotQuestions: SlotQuestion[] = [];
  try {
    if (slotQuestionsRes?.ok) {
      slotQuestions = (await slotQuestionsRes.json()) as SlotQuestion[];
    }
  } catch { /* ignore */ }

  let proctoringTimeline: Record<string, unknown> | null = null;
  try {
    if (proctoringRes?.ok) {
      proctoringTimeline = (await proctoringRes.json()) as Record<string, unknown>;
    }
  } catch { /* ignore */ }

  try {
    const doc = JSON.parse(interview.transcriptJson ?? "{}") as {
      meta?: {
        videoProctoring?: Record<string, unknown>;
        proctoringMode?: string;
        candidateSource?: string;
        tabSwitchCount?: number;
        tabSwitchViolation?: boolean;
        fullscreenExitCount?: number;
      };
    };
    const meta = doc.meta;
    const transcriptMode = meta?.proctoringMode;
    const isLightFromTranscript = transcriptMode === "light";

    if (isLightFromTranscript) {
      proctoringTimeline = {
        interviewId: id,
        proctoringMode: "light",
        candidateSource: meta?.candidateSource ?? (proctoringTimeline?.candidateSource as string | undefined) ?? null,
        status: "LIGHT_INTEGRITY",
        lightIntegrity: {
          tabSwitchCount: meta?.tabSwitchCount ?? 0,
          tabSwitchViolation: meta?.tabSwitchViolation ?? false,
          fullscreenExitCount: meta?.fullscreenExitCount ?? 0,
          proctoringMode: "light",
          candidateSource: meta?.candidateSource,
        },
        events: [],
        snapshots: [],
      };
    } else if (
      !proctoringTimeline?.events ||
      (Array.isArray(proctoringTimeline.events) && proctoringTimeline.events.length === 0)
    ) {
      const fromTranscript = meta?.videoProctoring;
      if (fromTranscript) {
        proctoringTimeline = {
          interviewId: id,
          integrityScore: fromTranscript.integrityScore ?? null,
          status: fromTranscript.status ?? "NOT_AVAILABLE",
          strikes: fromTranscript.strikes ?? {},
          events: [],
          snapshots: [],
          summary: fromTranscript,
          proctoringMode: "video",
          candidateSource: meta?.candidateSource ?? null,
        };
      }
    }
  } catch { /* ignore */ }

  scores = mergeAssessmentScores(scores, ai).map((s, i) => ({
    ...s,
    id: s.id ?? `merged-${i}`,
  })) as Score[];

  const scoreMax = inferAssessmentScoreMax(ai, scores);

  const banners = buildAssessmentBanners({
    ai,
    transcriptJson: interview.transcriptJson,
    recordingPath: interview.recordingPath,
    hasCodeSubmissions: codeSubmissions.length > 0,
    assessFailed,
  });

  return (
    <AppShell title="Review interview" subtitle={summary?.candidateName ?? "Unknown candidate"}>
    <ReviewPageScrollReset />
    {signedOff && (
      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
        Interview signed off successfully.
      </div>
    )}
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {summary?.candidateEmail && <span>{summary.candidateEmail}</span>}
            {summary?.jdTitle && <span className="text-zinc-300 dark:text-zinc-600">·</span>}
            {summary?.jdTitle && <span>{summary.jdTitle}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              interview.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" :
              interview.status === "SIGNED_OFF" ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800" :
              interview.status === "REVIEW_PENDING" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" :
              "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
            }`}>{interview.status.replace(/_/g, " ")}</span>
            {interview.proposedVerdict && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                Proposed: {interview.proposedVerdict.replace(/_/g, " ")}
              </span>
            )}
            {interview.finalVerdict && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                Final: {interview.finalVerdict.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {(isStaffAdminRole(session?.role)) && (
            <RerunAssessmentButton interviewId={interview.id} />
          )}
          <Link
            href="/admin/review"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            ← Back to Reviews
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <AssessmentBanners banners={banners} />
      </div>

      {ai?.summary ? (
        <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-200 text-xs dark:bg-sky-800">✨</span>
              AI Assessment
            </div>
            <span className="text-xs opacity-70">{(ai.source === "claude" ? "ai-two-pass" : ai.source) ?? "unknown"}{ai.scoredAt ? ` · ${ai.scoredAt}` : ""}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{cleanText(ai.summary)}</p>
          {ai.strengths?.length ? (
            <div className="mt-3 text-sm">
              <div className="font-medium">Strengths</div>
              <ul className="mt-1 list-inside list-disc">{ai.strengths.map((s: string, i: number) => <li key={i}>{cleanText(s)}</li>)}</ul>
            </div>
          ) : null}
          {ai.gaps?.length ? (
            <div className="mt-3 text-sm">
              <div className="font-medium">Gaps vs JD</div>
              <ul className="mt-1 list-inside list-disc">{ai.gaps.map((s: string, i: number) => <li key={i}>{cleanText(s)}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {speech && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Words / min", value: speech.wpm ?? "—", sub: "Speaking pace", good: (v: number) => v >= 100 && v <= 180 },
            { label: "Filler words", value: speech.fillers ?? "—", sub: "um, uh, like…", good: (v: number) => v <= 5 },
            { label: "Long silences", value: speech.longSilences ?? "—", sub: "Pauses > 30s", good: (v: number) => v === 0 },
            { label: "Candidate turns", value: speech.candidateTurns ?? "—", sub: "Responses given", good: (v: number) => v >= 5 },
          ].map(({ label, value, sub, good }) => {
            const num = typeof value === "number" ? value : null;
            const tone = num === null ? "zinc" : good(num) ? "emerald" : "amber";
            return (
              <div key={label} className={`rounded-xl border p-4 text-center ${
                tone === "emerald" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" :
                tone === "amber"   ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" :
                "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30"
              }`}>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${
                  tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" :
                  tone === "amber"   ? "text-amber-700 dark:text-amber-300" :
                  "text-zinc-700 dark:text-zinc-300"
                }`}>{String(value)}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {codeSubmissions.length > 0 && codeSubmissions.map((codeSubmission, idx) => (
        codeSubmission?.code ? (
        <div key={idx} className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">💻</span>
              Code Submission{codeSubmission.slot != null ? ` — Slot ${String(codeSubmission.slot)}` : ""}
              <span className="text-xs font-normal text-zinc-400 ml-1">{String(codeSubmission.language ?? "")}</span>
            </div>
            {(codeSubmission.aiReview as Record<string, unknown> | undefined) && (
              <div className="flex items-center gap-3 text-xs">
                <span className={`font-semibold ${
                  (codeSubmission.aiReview as { correctness?: string }).correctness === "correct" ? "text-emerald-600 dark:text-emerald-400"
                  : (codeSubmission.aiReview as { correctness?: string }).correctness === "partial" ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
                }`}>{String((codeSubmission.aiReview as { correctness?: string }).correctness ?? "")}</span>
                <span className="text-zinc-400">·</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">{String((codeSubmission.aiReview as { timeComplexity?: string }).timeComplexity ?? "")}</span>
                <span className="text-zinc-400">·</span>
                <span className={`font-bold ${
                  Number((codeSubmission.aiReview as { score?: number }).score) >= 4 ? "text-emerald-600 dark:text-emerald-400"
                  : Number((codeSubmission.aiReview as { score?: number }).score) >= 3 ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
                }`}>{String((codeSubmission.aiReview as { score?: number }).score ?? 0)}/5</span>
              </div>
            )}
          </div>

          {typeof codeSubmission.question === "string" && codeSubmission.question && (
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
              <span className="font-medium">Question:</span> {codeSubmission.question}
            </p>
          )}

          <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs font-mono text-zinc-100 leading-relaxed">
            {String(codeSubmission.code)}
          </pre>

          {Array.isArray(codeSubmission.results) && codeSubmission.results.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(codeSubmission.results as { passed?: boolean; name?: string }[]).map((r, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full font-medium ${
                  r.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}>
                  {r.passed ? "✓" : "✗"} {r.name}
                </span>
              ))}
            </div>
          )}

          {(codeSubmission.aiReview as { overallFeedback?: string } | undefined)?.overallFeedback && (
            <div className="mt-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 p-3 text-sm text-violet-900 dark:text-violet-200">
              {(codeSubmission.aiReview as { overallFeedback?: string }).overallFeedback}
            </div>
          )}

          {Array.isArray((codeSubmission.aiReview as { bugs?: string[] } | undefined)?.bugs) && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">🐛 Bugs</div>
              <ul className="space-y-0.5">{((codeSubmission.aiReview as { bugs: string[] }).bugs).map((b, i) => (
                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400">• {b}</li>
              ))}</ul>
            </div>
          )}

          {Array.isArray((codeSubmission.aiReview as { improvements?: string[] } | undefined)?.improvements) && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">💡 Improvements</div>
              <ul className="space-y-0.5">{((codeSubmission.aiReview as { improvements: string[] }).improvements).map((imp, i) => (
                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400">• {imp}</li>
              ))}</ul>
            </div>
          )}

          {typeof codeSubmission.complexity === "string" && codeSubmission.complexity && (
            <div className="mt-3 text-xs text-zinc-500">
              <span className="font-medium">Candidate stated complexity:</span> {codeSubmission.complexity}
            </div>
          )}
        </div>
        ) : null
      ))}

      {interview.recordingPath && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2 font-medium mb-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">🎧</span>
            Session Recording
          </div>
          <audio
            controls
            className="w-full"
            src={`/api/interviews/${id}/recording`}
          >
            Your browser does not support audio playback.
          </audio>
          <p className="mt-2 text-xs text-zinc-400">Audio recorded during the interview session.</p>
        </div>
      )}

      {slotQuestions.length > 0 && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2 font-medium mb-4">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">📋</span>
            Question slots (persisted)
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {slotQuestions.map((q) => (
              <div key={q.slotNumber} className="rounded-lg border border-zinc-100 p-3 text-sm dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Slot {q.slotNumber}</span>
                  {q.questionType && <span>· {q.questionType}</span>}
                  {q.source && <span>· {q.source}</span>}
                </div>
                <p className="mt-1 font-medium text-zinc-800 dark:text-zinc-200">{q.questionText}</p>
                {q.candidateAnswer ? (
                  <p className="mt-2 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">Answer:</span> {q.candidateAnswer}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400">No answer recorded for this slot.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <ProctoringTimelinePanel
          interviewId={interview.id}
          timeline={proctoringTimeline as Parameters<typeof ProctoringTimelinePanel>[0]["timeline"]}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
          <div className="flex items-center gap-2 font-medium mb-4">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">💬</span>
            Transcript
          </div>
          <div className="max-h-[480px] overflow-y-auto pr-1">
            <TranscriptView utterances={utterances} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2 font-medium mb-4">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">🎯</span>
            Scores
          </div>
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3">
            {scores.length ? scores.map((s) => (
              <div key={s.id} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/50 dark:bg-zinc-900/30 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{s.dimension}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {s.confidence && (
                      <span className={`flex items-center gap-1 ${
                        s.confidence === 'high' ? 'text-emerald-600 dark:text-emerald-400' :
                        s.confidence === 'medium' ? 'text-blue-600 dark:text-blue-400' :
                        'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          s.confidence === 'high' ? 'bg-emerald-500' :
                          s.confidence === 'medium' ? 'bg-blue-500' :
                          'bg-zinc-400'
                        }`} />
                        {s.confidence}
                      </span>
                    )}
                    <span className="rounded bg-zinc-200/50 px-2 py-0.5 font-medium dark:bg-zinc-800">{s.value}/{scoreMax}</span>
                  </div>
                </div>
                {s.rationale && <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{cleanText(s.rationale)}</p>}
                {s.evidence && <p className="mt-1.5 text-[11px] italic text-zinc-500 dark:text-zinc-500">"{s.evidence}"</p>}
                {s.gap && (
                  <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-900 dark:bg-red-900/20 dark:text-red-200">
                    <span className="font-semibold">Gap:</span> {s.gap}
                  </div>
                )}
              </div>
            )) : <p className="text-zinc-500 text-sm">No scores yet.</p>}
          </div>
        </div>
      </div>

      {/* New AI Assessment Sections */}
      {ai && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {ai.resumeConsistency && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Resume Consistency</h3>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">{ai.resumeConsistency.consistencyScore}/{scoreMax}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Demonstrated:</span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">{ai.resumeConsistency.demonstrated?.join(", ") || "None"}</span>
                </div>
                <div>
                  <span className="text-red-600 dark:text-red-400 font-medium">✕ Not demonstrated:</span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">{ai.resumeConsistency.notDemonstrated?.join(", ") || "None"}</span>
                </div>
                {(ai.resumeConsistency.flags?.length ?? 0) > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                    <div className="mb-1 text-xs font-medium">Flags</div>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {ai.resumeConsistency.flags!.map((flag: string, i: number) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {ai.behavioralSignals && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="font-medium mb-4">Behavioral Signals</h3>
              <div className="space-y-3">
                {[
                  { label: "Ownership", val: ai.behavioralSignals.ownership },
                  { label: "Learning Agility", val: ai.behavioralSignals.learningAgility },
                  { label: "Communication", val: ai.behavioralSignals.communication },
                  { label: "Confidence Calib.", val: ai.behavioralSignals.confidenceCalibration },
                ].map((signal, i) => {
                  const blocks = signal.val === "high" ? 4 : signal.val === "medium" ? 3 : 2;
                  return (
                    <div key={i} className="flex flex-wrap sm:flex-nowrap items-center justify-between text-sm gap-2">
                      <span className="w-32 text-zinc-600 dark:text-zinc-400">{signal.label}</span>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, j) => (
                            <div key={j} className={`h-2.5 w-5 rounded-sm ${j < blocks ? 'bg-zinc-800 dark:bg-zinc-200' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                          ))}
                        </div>
                        <span className="w-12 text-xs text-zinc-500">{signal.val}</span>
                      </div>
                    </div>
                  );
                })}
                {ai.behavioralSignals.summary && (
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">Summary:</span> {ai.behavioralSignals.summary}
                  </div>
                )}
              </div>
            </div>
          )}

          {ai.interviewQuality && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Interview Quality</h3>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">Coverage: {ai.interviewQuality.coverageScore}/{scoreMax}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Covered:</span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">{(ai.interviewQuality.categoriesCovered || ai.interviewQuality.covered)?.join(", ") || "None"}</span>
                </div>
                <div>
                  <span className="font-medium text-amber-600 dark:text-amber-400">Missed</span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">{(ai.interviewQuality.categoriesMissed || ai.interviewQuality.missed)?.join(", ") || "None"}</span>
                </div>
                {ai.interviewQuality.note && (
                  <p className="mt-3 text-xs italic text-zinc-500">Note: {ai.interviewQuality.note}</p>
                )}
              </div>
            </div>
          )}
          
          {ai.candidateFeedback?.prosAndCons && ai.candidateFeedback.prosAndCons.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
              <h3 className="font-medium mb-4">Pros & Cons</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <span>➕</span> Pros
                  </h4>
                  <ul className="space-y-1">
                    {ai.candidateFeedback.prosAndCons.flatMap((item: any, i: number) =>
                      normalizeFeedbackItemList(item.pros).map((pro, j) => (
                        <li key={`pro-${i}-${j}`} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                          <span>{pro}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                    <span>➖</span> Cons
                  </h4>
                  <ul className="space-y-1">
                    {ai.candidateFeedback.prosAndCons.flatMap((item: any, i: number) =>
                      normalizeFeedbackItemList(item.cons).map((con, j) => (
                        <li key={`con-${i}-${j}`} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                          <span>{con}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {ai.candidateFeedback?.roadmap && ai.candidateFeedback.roadmap.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="font-medium mb-3">Candidate Roadmap Given</h3>
              <div className="max-h-48 overflow-auto space-y-2 pr-1">
                {ai.candidateFeedback.roadmap.map((item: any, i: number) => (
                  <div key={i} className="flex gap-3 items-start text-sm bg-zinc-50 dark:bg-zinc-900 rounded p-2 border border-zinc-100 dark:border-zinc-800">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      D{typeof item.day === "string" ? (item.day.match(/\d+/)?.[0] ?? item.day) : item.day}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.focus}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[200px] sm:max-w-xs">{item.resource}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isStaffReadRole(session?.role) && (
        <ClientBriefPanel interviewId={interview.id} />
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">OK</span>
          Sign-off
        </div>

        {/* Show existing sign-off if present */}
        {existingSignOff.signedOff && (
          <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Current verdict:</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                {existingSignOff.finalVerdict}
              </span>
            </div>
            <p><span className="font-medium">Note:</span> {existingSignOff.note}</p>
            {existingSignOff.signedOffAt && (
              <p className="text-xs text-zinc-500">
                Last updated: {new Date(existingSignOff.signedOffAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {isStaffAdminRole(session?.role) ? (
          <>
            <p className="mt-3 text-sm text-zinc-600">
              {existingSignOff.signedOff ? "Update sign-off:" : "Admin can override and must leave a note."}
            </p>
            <form action={signOff} className="mt-3 grid gap-3">
              <input type="hidden" name="interviewId" value={interview.id} />
              <label className="grid gap-2 text-sm">
                Verdict
                <select
                  name="verdict"
                  required
                  defaultValue={existingSignOff.finalVerdict ?? ""}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
                >
                  <option value="" disabled>Select a verdict</option>
                  <option value="READY">Ready</option>
                  <option value="NEEDS_1_WEEK_PREP">Needs 1-week prep</option>
                  <option value="NEEDS_RESKILLING">Needs reskilling</option>
                  <option value="MISMATCH_WITH_JD">Mismatch with JD</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                Note (required)
                <textarea
                  name="note"
                  required
                  defaultValue={existingSignOff.note ?? ""}
                  placeholder="Explain rationale for sign-off / override…"
                  className="min-h-[90px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
                />
              </label>
              <div className="pt-1">
                <button
                  type="submit"
                  className="rounded-full bg-foreground px-6 py-2 text-background hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {existingSignOff.signedOff ? "Update sign-off" : "Sign off"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Sign-off is restricted to Admins.
          </p>
        )}
      </div>
    </div>
    </AppShell>
  );
}

async function signOff(formData: FormData) {
  "use server";

  const session = await getSession();
  if (!session || (!isStaffAdminRole(session.role))) redirect("/unauthorized");

  const parsed = SignOffSchema.parse({
    interviewId: formData.get("interviewId"),
    verdict: formData.get("verdict"),
    note: formData.get("note"),
  });

  const res = await apiServer(`/reviews/${parsed.interviewId}/sign-off`, session.token, {
    method: "POST",
    body: JSON.stringify({ interviewId: parsed.interviewId, verdict: parsed.verdict, note: parsed.note }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "Unknown error");
    throw new Error(`Sign-off failed (${res.status}): ${msg}`);
  }

  redirect(`/admin/interviews/${encodeURIComponent(parsed.interviewId)}/review?signedOff=1`);
}
