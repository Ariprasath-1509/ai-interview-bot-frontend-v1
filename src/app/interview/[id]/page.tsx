import { isStaffReadRole } from '@/lib/staffRoles';
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { VoiceInterviewForm } from "./VoiceInterviewForm";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { resolveProctoringMode, type ProctoringMode } from "@/lib/proctoring/mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CompleteSchema = z.object({
  interviewId: z.string().min(1),
  candidateNotes: z.string().optional().or(z.literal("")),
  transcriptJson: z.string().optional().or(z.literal("")),
  voiceValidationJson: z.string().optional().or(z.literal("")),
  codeSubmissionJson: z.string().optional().or(z.literal("")),
});

type Interview = {
  id: string;
  status: string;
  jdId: string;
  planId: string | null;
  interviewMode: string;
  customDurationMinutes: number | null;
  includeProgrammingQuestions?: boolean;
  candidateSource?: string | null;
  proctoringMode?: ProctoringMode | string | null;
};

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-[#050505]">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Interview not found</h1>
          <p className="mt-2 text-sm text-zinc-500">This link may be invalid or the interview was removed.</p>
          <Link href="/candidate/dashboard" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const session = await getSession();
  const isCandidate = session?.role === "CANDIDATE";
  const isStaff = isStaffReadRole(session?.role);
  if (!isCandidate && !isStaff) redirect("/login");

  const interviewRes = await apiServer(`/interviews/${id}`, session?.token);
  if (!interviewRes.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-[#050505]">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Interview not found</h1>
          <p className="mt-2 text-sm text-zinc-500">We could not load this interview. Check the link or contact your recruiter.</p>
          <Link href="/candidate/dashboard" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
        </div>
      </div>
    );
  }

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

  // Fetch plan rubric + candidate profile for the voice interview
  let rubricJson: string | null = null;
  let candidateProfileJson: string | null = null;
  if (interview.planId) {
    const planRes = await apiServer(`/interviews/plans/${interview.planId}`, session?.token).catch(() => null);
    if (planRes?.ok) {
      const plan = (await planRes.json()) as { rubricJson?: string; candidateProfileJson?: string };
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

  let candidateSource: string | null = interview.candidateSource ?? null;
  if (candidateSource == null && isCandidate) {
    const meRes = await apiServer("/auth/me", session?.token).catch(() => null);
    if (meRes?.ok) {
      const me = (await meRes.json()) as { source?: string | null };
      candidateSource = me.source ?? null;
    }
  }
  const proctoringMode: ProctoringMode =
    interview.proctoringMode === "video" || interview.proctoringMode === "light"
      ? interview.proctoringMode
      : resolveProctoringMode(candidateSource);

  return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#050505]">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            {isCandidate ? (
                <Link className="btn-secondary text-sm" href="/candidate/dashboard">← Dashboard</Link>
            ) : (
                <div className="flex flex-wrap gap-2">
                  <Link className="btn-secondary text-sm" href={`/observer/interview/${interview.id}`}>Observer view</Link>
                  <Link className="btn-secondary text-sm" href="/admin">Admin home</Link>
                </div>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {interview.interviewMode} · {durationMinutes} min
            </p>
          </div>

          <VoiceInterviewForm
              interviewId={interview.id}
              jdTitle={jdTitle}
              rubricJson={rubricJson}
              candidateProfileJson={candidateProfileJson}
              durationMinutes={durationMinutes}
              interviewMode={interview.interviewMode}
              proctoringMode={proctoringMode}
              candidateSource={candidateSource}
              includeProgrammingQuestions={interview.includeProgrammingQuestions !== false}
              completeInterview={completeInterview}
          />
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
    codeSubmissionJson: formData.get("codeSubmissionJson"),
  });

  // Parse code submission(s) if present — array of per-slot submissions or legacy single object
  let codeSubmissionPayload: unknown = null;
  try {
    if (parsed.codeSubmissionJson?.trim()) {
      codeSubmissionPayload = JSON.parse(parsed.codeSubmissionJson);
    }
  } catch { codeSubmissionPayload = null; }

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

  type AssessmentPayload = {
    technicalKnowledge?: { score: number; rationale: string };
    communication?: { score: number; rationale: string };
    proposedVerdict?: string;
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    source?: string;
    categoryScores?: { dimension: string; value: number; rationale?: string; gap?: string; evidence?: string }[];
  };

  const assessBody = {
    interviewId: parsed.interviewId,
    jdTitle,
    jdText,
    resumeSummary,
    transcriptJson,
    rubricJson,
    candidateProfileJson,
    interviewMode: interview.interviewMode ?? "L3",
    ...(codeSubmissionPayload ? { codeSubmissionJson: JSON.stringify(codeSubmissionPayload) } : {}),
  };

  let proposedVerdict = "";
  let assessmentMeta: Record<string, unknown> = {};
  let assessment: AssessmentPayload | null = null;

  const asyncStart = await apiServer("/ai/assess-async", session.token, {
    method: "POST",
    body: JSON.stringify(assessBody),
    timeoutMs: 30_000,
  });

  if (asyncStart.ok) {
    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await apiServer(`/ai/assess-status/${parsed.interviewId}`, session.token, {
        timeoutMs: 15_000,
      });
      if (!statusRes.ok) continue;
      const status = (await statusRes.json()) as {
        status?: string;
        result?: AssessmentPayload;
        error?: string;
      };
      if (status.status === "COMPLETED" && status.result) {
        assessment = status.result;
        break;
      }
      if (status.status === "FAILED") {
        assessmentMeta = {
          assessFailed: true,
          assessError: status.error ?? "failed",
          scoredAt: new Date().toISOString(),
          summary: "AI assessment failed. A reviewer can re-run assessment from the review page.",
        };
        break;
      }
    }
  }

  if (!assessment && !assessmentMeta.assessFailed) {
    assessmentMeta = {
      assessFailed: true,
      assessError: "timeout",
      scoredAt: new Date().toISOString(),
      summary: "AI assessment is still running or timed out. A reviewer can re-run assessment from the review page.",
    };
  }

  if (assessment) {
    proposedVerdict = assessment.proposedVerdict ?? "";
    assessmentMeta = { ...assessment, scoredAt: new Date().toISOString(), assessMode: "async" };

    await apiServer("/scores", session.token, {
      method: "POST",
      body: JSON.stringify({
        interviewId: parsed.interviewId,
        scores: assessment.categoryScores?.length ? assessment.categoryScores.map((s) => ({
          dimension: s.dimension,
          value: s.value,
          rationale: s.rationale,
          evidence: s.evidence,
          gap: s.gap,
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
      ...(codeSubmissionPayload ? { codeSubmissions: codeSubmissionPayload, codeSubmission: Array.isArray(codeSubmissionPayload) ? codeSubmissionPayload[codeSubmissionPayload.length - 1] : codeSubmissionPayload } : {}),
    },
  });

  await apiServer(`/interviews/${parsed.interviewId}/complete`, session.token, {
    method: "PATCH",
    body: JSON.stringify({ transcriptJson: mergedTranscript, proposedVerdict, status: "REVIEW_PENDING" }),
    timeoutMs: 30_000,
  }).catch(() => null);

  if (isCandidate) {
    redirect(`/candidate/feedback/${encodeURIComponent(parsed.interviewId)}`);
  }
  redirect(`/admin/interviews/${encodeURIComponent(parsed.interviewId)}/review`);
}
