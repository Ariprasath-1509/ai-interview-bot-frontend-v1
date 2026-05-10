import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { VoiceInterviewForm } from "./VoiceInterviewForm";
import { InterviewPlanPanel } from "./InterviewPlanPanel";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CompleteSchema = z.object({
  interviewId: z.string().min(1),
  candidateNotes: z.string().optional().or(z.literal("")),
  transcriptJson: z.string().optional().or(z.literal("")),
  voiceValidationJson: z.string().optional().or(z.literal("")),
});

type Interview = { 
  id: string; 
  status: string; 
  jdId: string; 
  planId: string | null;
  interviewMode: string;
  customDurationMinutes: number | null;
};

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const session = await getSession();
  const isCandidate = session?.role === "CANDIDATE";
  const isOwner = session?.role === "RECRUITER";
  const isManager = session?.role === "ADMIN" || session?.role === "SUPER_ADMIN" || session?.role === "RECRUITER";
  if (!isCandidate && !isOwner && !isManager) redirect("/login");

  const interviewRes = await apiServer(`/interviews/${id}`, session?.token);
  if (!interviewRes.ok) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-semibold">Not found</h1></div>;

  const interview = (await interviewRes.json()) as Interview;

  // Calculate interview duration based on mode or custom duration
  const getInterviewDurationMinutes = (mode: string, customDuration: number | null): number => {
    if (customDuration) return customDuration;
    switch (mode) {
      case 'SCREENING': return 15;
      case 'L1': return 20;
      case 'L2': return 25;
      case 'L3': return 30;
      case 'L4': return 30;
      default: return 30;
    }
  };

  const durationMinutes = getInterviewDurationMinutes(interview.interviewMode, interview.customDurationMinutes);

  // Fetch plan for slot panel + rubric
  let slotsJson: string | null = null;
  let rubricJson: string | null = null;
  let candidateProfileJson: string | null = null;
  if (interview.planId) {
    const planRes = await apiServer(`/interviews/plans/${interview.planId}`, session?.token).catch(() => null);
    if (planRes?.ok) {
      const plan = (await planRes.json()) as { slotsJson?: string; rubricJson?: string; candidateProfileJson?: string };
      slotsJson = plan.slotsJson ?? null;
      rubricJson = plan.rubricJson ?? null;
      candidateProfileJson = plan.candidateProfileJson ?? null;
    }
  }

  // Fetch JD title for display
  let jdTitle = "Target role";
  const jdRes = await apiServer(`/interviews/jd/${interview.jdId}`, session?.token).catch(() => null);
  if (jdRes?.ok) {
    const jd = (await jdRes.json()) as { title?: string };
    jdTitle = jd.title ?? jdTitle;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Live interview</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">JD: {jdTitle} • Status: {interview.status}</p>
          </div>
          <div className="flex shrink-0 gap-3 text-sm">
            {isCandidate ? (
              <Link className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900" href="/candidate/dashboard">Dashboard</Link>
            ) : (
              <>
                <Link className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900" href={`/observer/interview/${interview.id}`}>Observer</Link>
                <Link className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900" href="/dashboard">Dashboard</Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <InterviewPlanPanel slotsJson={slotsJson} />
          <VoiceInterviewForm
            interviewId={interview.id}
            jdTitle={jdTitle}
            rubricJson={rubricJson}
            candidateProfileJson={candidateProfileJson}
            durationMinutes={durationMinutes}
            interviewMode={interview.interviewMode}
            completeInterview={completeInterview}
          />
        </div>
      </div>
    </div>
  );
}

async function completeInterview(formData: FormData) {
  "use server";

  const session = await getSession();
  if (!session) redirect("/login");
  const isCandidate = session.role === "CANDIDATE";

  const parsed = CompleteSchema.parse({
    interviewId: formData.get("interviewId"),
    candidateNotes: formData.get("candidateNotes"),
    transcriptJson: formData.get("transcriptJson"),
    voiceValidationJson: formData.get("voiceValidationJson"),
  });

  const transcriptJson = parsed.transcriptJson?.trim() || JSON.stringify({
    meta: { generated: true },
    utterances: [],
  });

  // Fetch interview + JD + plan for assessment context
  const interviewRes = await apiServer(`/interviews/${parsed.interviewId}`, session.token);
  if (!interviewRes.ok) redirect("/admin/interviews/create?error=Interview%20not%20found");
  const interview = (await interviewRes.json()) as { jdId: string; planId: string | null; interviewMode?: string };

  let jdTitle = "Target role";
  let jdText = "";
  const jdRes = await apiServer(`/interviews/jd/${interview.jdId}`, session.token).catch(() => null);
  if (jdRes?.ok) {
    const jd = (await jdRes.json()) as { title?: string; text?: string };
    jdTitle = jd.title ?? jdTitle;
    jdText = jd.text ?? jdText;
  }

  let resumeSummary: string | undefined;
  let rubricJson: string | undefined;
  let candidateProfileJson: string | undefined;
  if (interview.planId) {
    const planRes = await apiServer(`/interviews/plans/${interview.planId}`, session.token).catch(() => null);
    if (planRes?.ok) {
      const plan = (await planRes.json()) as { gapMapJson?: string; rubricJson?: string; candidateProfileJson?: string };
      rubricJson = plan.rubricJson;
      candidateProfileJson = plan.candidateProfileJson;
      try {
        const gap = JSON.parse(plan.gapMapJson ?? "{}") as { resumeSummary?: string };
        resumeSummary = gap.resumeSummary?.trim() || undefined;
      } catch { /* ignore */ }
    }
  }

  // Call ai-service for assessment
  const assessRes = await apiServer("/ai/assess", session.token, {
    method: "POST",
    body: JSON.stringify({ 
      interviewId: parsed.interviewId,
      jdTitle, 
      jdText, 
      resumeSummary, 
      transcriptJson, 
      rubricJson, 
      candidateProfileJson,
      interviewMode: interview.interviewMode ?? "L3"
    }),
  });

  let proposedVerdict = "NEEDS_1_WEEK_PREP";
  let assessmentMeta: Record<string, unknown> = {};

  if (assessRes.ok) {
    const assessment = (await assessRes.json()) as {
      technicalKnowledge?: { score: number; rationale: string };
      communication?: { score: number; rationale: string };
      proposedVerdict: string;
      summary: string;
      strengths: string[];
      gaps: string[];
      source: string;
      categoryScores?: { dimension: string; value: number; rationale?: string; gap?: string; evidence?: string }[];
    };

    proposedVerdict = assessment.proposedVerdict;
    assessmentMeta = { ...assessment, scoredAt: new Date().toISOString() };

    // Save scores to review-service
    await apiServer("/scores", session.token, {
      method: "POST",
      body: JSON.stringify({
        interviewId: parsed.interviewId,
        scores: assessment.categoryScores?.length ? assessment.categoryScores.map(s => ({
          dimension: s.dimension,
          value: s.value,
          rationale: s.rationale,
          evidence: s.evidence,
          gap: s.gap
        })) : [
          { dimension: "TechnicalKnowledge", value: assessment.technicalKnowledge?.score ?? 1, rationale: assessment.technicalKnowledge?.rationale ?? "No rationale provided" },
          { dimension: "Communication", value: assessment.communication?.score ?? 1, rationale: assessment.communication?.rationale ?? "No rationale provided" },
        ],
      }),
    }).catch(() => null);
  }

  // Merge assessment into transcript and update interview
  let transcriptDoc: Record<string, unknown> = {};
  try { transcriptDoc = JSON.parse(transcriptJson) as Record<string, unknown>; } catch { /* ignore */ }
  let voiceValidationMeta: Record<string, unknown> | null = null;
  try {
    if (parsed.voiceValidationJson?.trim()) {
      voiceValidationMeta = JSON.parse(parsed.voiceValidationJson) as Record<string, unknown>;
    }
  } catch {
    voiceValidationMeta = null;
  }
  const mergedTranscript = JSON.stringify({
    ...transcriptDoc,
    meta: {
      ...(transcriptDoc.meta as object ?? {}),
      aiAssessment: assessmentMeta,
      ...(voiceValidationMeta ? { voiceValidation: voiceValidationMeta } : {}),
    },
  });

  await apiServer(`/interviews/${parsed.interviewId}/complete`, session.token, {
    method: "PATCH",
    body: JSON.stringify({ transcriptJson: mergedTranscript, proposedVerdict, status: "REVIEW_PENDING" }),
  }).catch(() => null);

  if (isCandidate) {
    redirect(`/candidate/feedback/${encodeURIComponent(parsed.interviewId)}`);
  }
  redirect(`/admin/interviews/${encodeURIComponent(parsed.interviewId)}/review`);
}
