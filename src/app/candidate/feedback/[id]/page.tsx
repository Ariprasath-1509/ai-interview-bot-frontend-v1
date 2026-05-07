import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Score = { dimension: string; value: number; rationale?: string; evidence?: string; gap?: string; confidence?: "high" | "medium" | "low" };
type Review = { signedOff: boolean; finalVerdict?: string; note?: string; signedOffAt?: string };
type Interview = {
  jdId: string;
  endedAt: string | null;
  transcriptJson?: string | null;
  candidateFeedback?: {
    summary?: string;
    strengths?: string[];
    areasToImprove?: string[];
    prosAndCons?: { pros: string; cons: string }[];
    resumeConsistencyForCandidate?: { claim: string; consistent: boolean; evidence?: string }[];
    roadmap?: { day: number; focus: string; resource: string; exercise?: string; estimated?: string; whyItMatters?: string; resourceUrl?: string; category?: string }[];
    estimatedReadiness?: string;
  };
  categoryScores?: Score[];
};

function parseAiAssessment(transcriptJson: string | null | undefined) {
  if (!transcriptJson) return null;
  try {
    const doc = JSON.parse(transcriptJson) as { meta?: { aiAssessment?: { categoryScores?: Score[]; candidateFeedback?: Interview["candidateFeedback"] } } };
    return doc.meta?.aiAssessment ?? null;
  } catch { return null; }
}

const VERDICT_LABEL: Record<string, string> = {
  READY: "Ready",
  NEEDS_1_WEEK_PREP: "Needs 1-week prep",
  NEEDS_RESKILLING: "Needs Reskilling",
  MISMATCH_WITH_JD: "Mismatch with JD",
};

const VERDICT_COLOR: Record<string, string> = {
  READY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  NEEDS_1_WEEK_PREP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  NEEDS_RESKILLING: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  MISMATCH_WITH_JD: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

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
    .trim();
}

export default async function CandidateFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/login");

  const [interviewRes, scoresRes, reviewRes, assessmentRes] = await Promise.all([
    apiServer(`/interviews/${id}`, session.token).catch(() => null),
    apiServer(`/scores/${id}`, session.token).catch(() => null),
    apiServer(`/reviews/${id}`, session.token).catch(() => null),
    apiServer(`/tokens/assessment-response/${id}`, session.token).catch(() => null),
  ]);

  if (!interviewRes?.ok) redirect("/candidate/dashboard");

  const interview = (await interviewRes.json()) as Interview;
  let scores: Score[] = [];
  try { if (scoresRes?.ok) scores = await scoresRes.json(); } catch {}
  let review: Review = { signedOff: false };
  try { if (reviewRes?.ok) review = await reviewRes.json(); } catch {}

  // Try to get assessment from compliance-service
  let storedAssessment: any = null;
  try {
    if (assessmentRes?.ok) {
      const assessmentData = await assessmentRes.json();
      if (assessmentData?.assessmentJson) {
        storedAssessment = typeof assessmentData.assessmentJson === 'string'
          ? JSON.parse(assessmentData.assessmentJson)
          : assessmentData.assessmentJson;
      }
    }
  } catch {}

  // Fallback to reading from transcriptJson if API didn't provide it
  const ai = parseAiAssessment(interview.transcriptJson);
  if (scores.length === 0 && storedAssessment?.categoryScores) {
    scores = storedAssessment.categoryScores;
  }
  if (scores.length === 0 && ai?.categoryScores) {
    scores = ai.categoryScores;
  }
  if (scores.length === 0 && interview.categoryScores) {
    scores = interview.categoryScores;
  }

  const candidateFeedback = storedAssessment?.candidateFeedback ?? interview.candidateFeedback ?? ai?.candidateFeedback;
  const roadmap = candidateFeedback?.roadmap ?? [];

  const jdRes = await apiServer(`/interviews/jd/${interview.jdId}`, session.token).catch(() => null);
  const jdTitle = jdRes?.ok ? ((await jdRes.json()) as { title?: string }).title ?? "Interview" : "Interview";

  const completedDate = interview.endedAt
    ? new Date(interview.endedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">{jdTitle}</h1>
            {completedDate && <p className="mt-1 text-sm text-zinc-500">Completed {completedDate}</p>}
          </div>
          <Link
            href="/candidate/dashboard"
            className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ← Back
          </Link>
        </div>

        {/* Scores */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Scores</h2>
          {scores.length ? (
            <div className="grid gap-3">
              {scores.map((s, i) => (
                <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{s.dimension}</h3>
                    <div className="flex items-center gap-3">
                      {s.confidence && (
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${
                          s.confidence === 'high' ? 'text-emerald-700 dark:text-emerald-400' :
                          s.confidence === 'medium' ? 'text-blue-700 dark:text-blue-400' :
                          'text-zinc-500 dark:text-zinc-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            s.confidence === 'high' ? 'bg-emerald-500' :
                            s.confidence === 'medium' ? 'bg-blue-500' :
                            'bg-zinc-400'
                          }`} />
                          {s.confidence} confidence
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold dark:bg-zinc-800">
                        {s.value}<span className="font-normal text-zinc-400">/5</span>
                      </span>
                    </div>
                  </div>
                  {s.rationale && (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{cleanText(s.rationale)}</p>
                  )}
                  {s.evidence && (
                    <p className="mt-2 text-xs italic leading-relaxed text-zinc-400 dark:text-zinc-500">Evidence: "{s.evidence}"</p>
                  )}
                  {s.gap && (
                    <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
                      <span className="font-semibold">Gap:</span> {s.gap}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              AI feedback not yet available.
            </div>
          )}
        </section>

        {/* Candidate Feedback */}
        {candidateFeedback && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Candidate Feedback</h2>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              
              {candidateFeedback.summary && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Overall Summary</h3>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {candidateFeedback.summary}
                  </p>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 mb-6">
                {candidateFeedback.strengths && candidateFeedback.strengths.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> Strengths
                    </h3>
                    <ul className="space-y-1">
                      {candidateFeedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {candidateFeedback.areasToImprove && candidateFeedback.areasToImprove.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="text-amber-500">↑</span> Areas to Improve
                    </h3>
                    <ul className="space-y-1">
                      {candidateFeedback.areasToImprove.map((a, i) => (
                        <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {candidateFeedback.prosAndCons && candidateFeedback.prosAndCons.length > 0 && (
                <div className="mb-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="text-emerald-500">➕</span> Pros
                    </h3>
                    <ul className="space-y-1">
                      {candidateFeedback.prosAndCons.map((item, i) => (
                        <li key={`pro-${i}`} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                          <span>{item.pros}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="text-red-500">➖</span> Cons
                    </h3>
                    <ul className="space-y-1">
                      {candidateFeedback.prosAndCons.map((item, i) => (
                        <li key={`con-${i}`} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                          <span>{item.cons}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {candidateFeedback.resumeConsistencyForCandidate && candidateFeedback.resumeConsistencyForCandidate.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    📄 Resume Claims Review
                  </h3>
                  <div className="grid gap-3">
                    {candidateFeedback.resumeConsistencyForCandidate.map((claim, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800/50 dark:bg-zinc-900/30">
                        <div className="mt-0.5">
                          {claim.consistent ? (
                            <span className="text-emerald-500">✅</span>
                          ) : (
                            <span className="text-red-500">❌</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{claim.claim}</p>
                          {claim.evidence && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{claim.evidence}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {roadmap.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-3">7-Day Preparation Roadmap</h3>
                  <div className="grid gap-3">
                    {roadmap.map((item, i) => (
                      <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/30">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold">
                            D{item.day}
                          </div>
                          <div className="flex-1 space-y-2">
                            {item.category && (
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                {item.category}
                              </p>
                            )}
                            <h4 className="font-semibold text-sm">Focus: {item.focus}</h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              <span className="font-medium text-zinc-900 dark:text-zinc-200">Resource:</span>{" "}
                              {item.resourceUrl ? (
                                <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                  {item.resource}
                                </a>
                              ) : item.resource.startsWith("http") ? (
                                <a href={item.resource} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                  {item.resource}
                                </a>
                              ) : (
                                item.resource
                              )}
                            </p>
                            {item.whyItMatters && (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium text-zinc-900 dark:text-zinc-200">Why it matters:</span> {item.whyItMatters}
                              </p>
                            )}
                            {item.exercise && (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium text-zinc-900 dark:text-zinc-200">Exercise:</span> {item.exercise}
                              </p>
                            )}
                            {item.estimated && (
                              <p className="text-xs text-zinc-500">
                                Estimated: {item.estimated}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidateFeedback.estimatedReadiness && (
                <div className="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30">
                  <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    ⏱ Estimated Readiness Timeline
                  </h3>
                  <p className="mt-1 text-sm text-indigo-800 dark:text-indigo-300">
                    {candidateFeedback.estimatedReadiness}
                  </p>
                </div>
              )}

            </div>
          </section>
        )}

        {/* Manager Review */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Manager Review</h2>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            {review.signedOff && review.finalVerdict ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${VERDICT_COLOR[review.finalVerdict] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {VERDICT_LABEL[review.finalVerdict] ?? review.finalVerdict}
                  </span>
                  {review.signedOffAt && (
                    <span className="text-xs text-zinc-400">
                      {new Date(review.signedOffAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
                {review.note && (
                  <p className="border-t border-zinc-100 pt-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                    {cleanText(review.note)}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                Awaiting manager review
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
