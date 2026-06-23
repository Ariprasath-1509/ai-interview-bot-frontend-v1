import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Score = {
  dimension: string;
  value: number;
  rationale?: string;
  evidence?: string;
};

type Review = {
  signedOff: boolean;
  finalVerdict?: string;
  note?: string;
  signedOffAt?: string;
};

const VERDICT_LABEL: Record<string, string> = {
  READY: "Ready",
  NOT_READY: "Not Ready",
  NEEDS_COACHING: "Needs Coaching",
  NEEDS_1_WEEK_PREP: "Needs 1-week prep",
  NEEDS_RESKILLING: "Needs Reskilling",
  MISMATCH_WITH_JD: "Mismatch with JD",
};

const VERDICT_COLOR: Record<string, string> = {
  READY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  NOT_READY: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  NEEDS_COACHING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
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

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/unauthorized");

  const [scoresRes, reviewRes] = await Promise.all([
    apiServer(`/scores/${id}`, session.token).catch(() => null),
    apiServer(`/reviews/${id}`, session.token).catch(() => null),
  ]);

  const scores: Score[] = scoresRes?.ok ? await scoresRes.json() : [];
  const review: Review = reviewRes?.ok ? await reviewRes.json() : { signedOff: false };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Interview Feedback</h1>
            <p className="mt-1 text-sm text-zinc-500">Your results and manager sign-off</p>
          </div>
          <Link
            href="/candidate/dashboard"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold dark:bg-zinc-800">
                      {s.value}<span className="text-zinc-400 font-normal">/5</span>
                    </span>
                  </div>
                  {s.rationale && (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{cleanText(s.rationale)}</p>
                  )}
                  {s.evidence && (
                    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Evidence: </span>{s.evidence}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              Feedback not yet available.
            </div>
          )}
        </section>

        {/* Manager Sign-off */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Manager Sign-off</h2>
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
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
                Awaiting manager review
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
