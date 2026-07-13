import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const GATEWAY = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

const BodySchema = z.object({
  transcriptJson: z.string().min(2),
  codeSubmissionJson: z.string().optional(),
});

type AssessmentPayload = {
  proposedVerdict?: string;
  categoryScores?: { dimension: string; value: number; rationale?: string; gap?: string; evidence?: string }[];
  technicalKnowledge?: { score: number; rationale: string };
  communication?: { score: number; rationale: string };
  summary?: string;
  // Onboarding single-pass shape (see ai-service AssessmentService.onboardingAssessment) —
  // one holistic score, not a category breakdown.
  score?: number;
  [key: string]: unknown;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return NextResponse.json({ error: "Missing interview id" }, { status: 400 });

  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawBody = await req.json().catch(() => null);
  const body = BodySchema.safeParse(rawBody);
  if (!body.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  let utteranceCount = 0;
  try {
    const doc = JSON.parse(body.data.transcriptJson) as { utterances?: unknown[] };
    utteranceCount = Array.isArray(doc.utterances) ? doc.utterances.length : 0;
  } catch {
    return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
  }
  if (utteranceCount < 2) {
    return NextResponse.json({ skipped: true, reason: "insufficient_content" });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const interviewRes = await fetch(`${GATEWAY}/interviews/${id}`, { headers }).catch(() => null);
  if (!interviewRes?.ok) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const interview = await interviewRes.json() as {
    jdId: string;
    planId: string | null;
    interviewMode?: string;
    assessmentType?: string;
    proposedVerdict?: string;
    status?: string;
  };

  let jdTitle = "Target role";
  let jdText = "";
  const jdRes = await fetch(`${GATEWAY}/interviews/jd/${interview.jdId}`, { headers }).catch(() => null);
  if (jdRes?.ok) {
    const jd = await jdRes.json() as { title?: string; text?: string };
    jdTitle = jd.title ?? jdTitle;
    jdText = jd.text ?? "";
  }

  let resumeSummary: string | undefined;
  let rubricJson: string | undefined;
  let candidateProfileJson: string | undefined;
  if (interview.planId) {
    const planRes = await fetch(`${GATEWAY}/interviews/plans/${interview.planId}`, { headers }).catch(() => null);
    if (planRes?.ok) {
      const plan = await planRes.json() as { gapMapJson?: string; rubricJson?: string; candidateProfileJson?: string };
      rubricJson = plan.rubricJson;
      candidateProfileJson = plan.candidateProfileJson;
      try {
        const gap = JSON.parse(plan.gapMapJson ?? "{}") as { resumeSummary?: string };
        resumeSummary = gap.resumeSummary?.trim() || undefined;
      } catch { /* ignore */ }
    }
  }

  const assessRes = await fetch(`${GATEWAY}/ai/assess`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      interviewId: id,
      jdTitle,
      jdText,
      resumeSummary,
      transcriptJson: body.data.transcriptJson,
      rubricJson,
      candidateProfileJson,
      interviewMode: interview.interviewMode ?? "L3",
      assessmentType: interview.assessmentType,
      ...(body.data.codeSubmissionJson?.trim()
        ? { codeSubmissionJson: body.data.codeSubmissionJson }
        : {}),
    }),
    signal: AbortSignal.timeout(110_000),
  }).catch(() => null);

  if (!assessRes?.ok) {
    return NextResponse.json({ error: "Assessment failed" }, { status: 502 });
  }

  const assessment = await assessRes.json() as AssessmentPayload;
  const assessmentScores = assessment.categoryScores?.length
    ? assessment.categoryScores
    : typeof assessment.score === "number"
    ? [
        { dimension: "ConceptUnderstanding", value: assessment.score, rationale: assessment.summary },
      ]
    : [
        {
          dimension: "TechnicalKnowledge",
          value: assessment.technicalKnowledge?.score ?? 1,
          rationale: assessment.technicalKnowledge?.rationale,
        },
        {
          dimension: "Communication",
          value: assessment.communication?.score ?? 1,
          rationale: assessment.communication?.rationale,
        },
      ];

  if (assessmentScores.length) {
    await fetch(`${GATEWAY}/scores`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        interviewId: id,
        scores: assessmentScores.map((s) => ({
          dimension: s.dimension,
          value: s.value,
          rationale: s.rationale,
          evidence: s.evidence,
          gap: s.gap,
        })),
      }),
    }).catch(() => null);
  }

  let transcriptDoc: Record<string, unknown> = {};
  try {
    transcriptDoc = JSON.parse(body.data.transcriptJson) as Record<string, unknown>;
  } catch { /* ignore */ }

  let codeSubmissionPayload: unknown = null;
  if (body.data.codeSubmissionJson?.trim()) {
    try {
      codeSubmissionPayload = JSON.parse(body.data.codeSubmissionJson);
    } catch { /* ignore */ }
  }

  const mergedTranscript = JSON.stringify({
    ...transcriptDoc,
    meta: {
      ...(transcriptDoc.meta as object ?? {}),
      aiAssessment: { ...assessment, scoredAt: new Date().toISOString(), assessMode: "partial_abandon" },
      ...(codeSubmissionPayload
        ? {
            codeSubmissions: codeSubmissionPayload,
            codeSubmission: Array.isArray(codeSubmissionPayload)
              ? codeSubmissionPayload[codeSubmissionPayload.length - 1]
              : codeSubmissionPayload,
          }
        : {}),
    },
  });

  const isWithdrawn = interview.status === "WITHDRAWN";
  await fetch(`${GATEWAY}/interviews/${id}/complete`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      transcriptJson: mergedTranscript,
      proposedVerdict: isWithdrawn ? "WITHDRAWN" : (interview.proposedVerdict ?? assessment.proposedVerdict ?? "WITHDRAWN"),
      ...(isWithdrawn ? {} : { status: "REVIEW_PENDING" }),
    }),
  }).catch(() => null);

  return NextResponse.json({ success: true });
}
