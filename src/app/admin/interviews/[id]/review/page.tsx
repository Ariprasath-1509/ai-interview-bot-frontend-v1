import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { TranscriptView } from "./TranscriptView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SignOffSchema = z.object({
  interviewId: z.string().min(1),
  verdict: z.enum(["READY", "NEEDS_1_WEEK_PREP", "NEEDS_RESKILLING", "MISMATCH_WITH_JD"]),
  note: z.string().min(1),
});

type Score = { id: string; dimension: string; value: number; rationale?: string; gap?: string; evidence?: string; confidence?: "high" | "medium" | "low" };
type Interview = {
  id: string;
  status: string;
  proposedVerdict: string | null;
  finalVerdict: string | null;
  transcriptJson: string | null;
};

function parseTranscript(transcriptJson: string | null): { speaker: string; text: string; at: string }[] {
  if (!transcriptJson) return [];
  try {
    const doc = JSON.parse(transcriptJson) as { utterances?: { speaker: string; text: string; at: string }[] };
    return Array.isArray(doc.utterances) ? doc.utterances : [];
  } catch { return []; }
}

function parseAiAssessment(transcriptJson: string | null) {
  if (!transcriptJson) return null;
  try {
    const doc = JSON.parse(transcriptJson) as { meta?: { aiAssessment?: any } };
    return doc.meta?.aiAssessment ?? null;
  } catch { return null; }
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

export default async function InterviewReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const session = await getSession();

  const [interviewRes, scoresRes, summaryRes, signOffRes] = await Promise.all([
    apiServer(`/interviews/${id}`, session?.token),
    apiServer(`/scores/${id}`, session?.token),
    apiServer(`/interviews/summary`, session?.token),
    apiServer(`/reviews/${id}`, session?.token),
  ]);

  if (!interviewRes.ok) return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const interview = (await interviewRes.json()) as Interview;
  let scores: Score[] = scoresRes.ok ? await scoresRes.json() : [];
  const summaries: { id: string; candidateName: string; candidateEmail: string; jdTitle: string }[] =
    summaryRes?.ok ? await summaryRes.json() : [];
  const summary = summaries.find((s) => s.id === id);
  const existingSignOff: SignOff = signOffRes?.ok ? await signOffRes.json() : { signedOff: false };
  const ai = parseAiAssessment(interview.transcriptJson);
  const utterances = parseTranscript(interview.transcriptJson);

  // Fallback to reading from transcriptJson if API didn't provide it
  // and we don't have scores yet
  if (scores.length === 0 && ai?.categoryScores) {
    scores = ai.categoryScores.map((s: Omit<Score, "id">, i: number) => ({ ...s, id: `ai-${i}` }));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Review interview</h1>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 font-medium">
            {summary?.candidateName ?? "Unknown candidate"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {summary?.candidateEmail ?? ""}{summary?.jdTitle ? ` · ${summary.jdTitle}` : ""}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Status: {interview.status} • Proposed: {interview.proposedVerdict ?? "-"} • Final: {interview.finalVerdict ?? "-"}
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-sm">
          <Link className="underline" href={`/observer/interview/${interview.id}`}>Observer view</Link>
          <Link className="underline" href="/admin/review">Back</Link>
        </div>
      </div>

      {ai?.summary ? (
        <div className="mt-8 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">AI assessment</div>
            <span className="text-xs opacity-80">Source: {ai.source ?? "unknown"}{ai.scoredAt ? ` · ${ai.scoredAt}` : ""}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{cleanText(ai.summary)}</p>
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

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
          <div className="font-medium mb-3">Transcript</div>
          <div className="max-h-[480px] overflow-y-auto pr-1">
            <TranscriptView utterances={utterances} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="font-medium mb-3">Scores</div>
          <div className="grid gap-3 text-sm">
            {scores.length ? scores.map((s) => (
              <div key={s.id} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/50 dark:bg-zinc-900/30">
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
                    <span className="rounded bg-zinc-200/50 px-2 py-0.5 font-medium dark:bg-zinc-800">{s.value}/5</span>
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
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">{ai.resumeConsistency.consistencyScore}/5</span>
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
                {ai.resumeConsistency.flags?.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                    <div className="font-medium text-xs mb-1">⚠ Flags:</div>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {ai.resumeConsistency.flags.map((flag: string, i: number) => (
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
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">Coverage: {ai.interviewQuality.coverageScore}/5</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Covered:</span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">{ai.interviewQuality.covered?.join(", ") || "None"}</span>
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">⚠ Missed:</span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">{ai.interviewQuality.missed?.join(", ") || "None"}</span>
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
                    {ai.candidateFeedback.prosAndCons.map((item: any, i: number) => (
                      <li key={`pro-${i}`} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                        <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                        <span>{item.pros}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                    <span>➖</span> Cons
                  </h4>
                  <ul className="space-y-1">
                    {ai.candidateFeedback.prosAndCons.map((item: any, i: number) => (
                      <li key={`con-${i}`} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                        <span className="text-zinc-300 dark:text-zinc-700 mt-0.5">•</span>
                        <span>{item.cons}</span>
                      </li>
                    ))}
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
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">D{item.day}</div>
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

      <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="font-medium">Sign-off</div>

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

        {session?.role === "BENCH_MANAGER" ? (
          <>
            <p className="mt-3 text-sm text-zinc-600">
              {existingSignOff.signedOff ? "Update sign-off:" : "Bench manager can override and must leave a note."}
            </p>
            <form action={signOff} className="mt-3 grid gap-3">
              <input type="hidden" name="interviewId" value={interview.id} />
              <label className="grid gap-2 text-sm">
                Verdict
                <select
                  name="verdict"
                  defaultValue={existingSignOff.finalVerdict ?? interview.proposedVerdict ?? "NEEDS_1_WEEK_PREP"}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
                >
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
            Sign-off is restricted to Bench Managers.
          </p>
        )}
      </div>
    </div>
  );
}

async function signOff(formData: FormData) {
  "use server";

  const session = await getSession();
  if (!session || session.role !== "BENCH_MANAGER") redirect("/unauthorized");

  const parsed = SignOffSchema.parse({
    interviewId: formData.get("interviewId"),
    verdict: formData.get("verdict"),
    note: formData.get("note"),
  });

  await apiServer(`/reviews/${parsed.interviewId}/sign-off`, session.token, {
    method: "POST",
    body: JSON.stringify({ interviewId: parsed.interviewId, verdict: parsed.verdict, note: parsed.note }),
  });

  redirect(`/admin/interviews/${encodeURIComponent(parsed.interviewId)}/review`);
}
