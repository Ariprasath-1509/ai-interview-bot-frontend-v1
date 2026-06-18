const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export type ReassessInterview = {
  id: string;
  jdId: string;
  planId: string | null;
  transcriptJson: string | null;
  interviewMode?: string;
};

export async function loadReassessContext(interviewId: string, token: string) {
  const interviewRes = await fetch(`${GATEWAY}/interviews/${interviewId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!interviewRes.ok) {
    return { error: 'Interview not found', status: 404 as const };
  }

  const interview = (await interviewRes.json()) as ReassessInterview;
  if (!interview.transcriptJson) {
    return { error: 'No transcript available for this interview', status: 400 as const };
  }

  let codeSubmissionJson: string | undefined;
  try {
    const doc = JSON.parse(interview.transcriptJson) as {
      meta?: { codeSubmissions?: unknown; codeSubmission?: unknown };
    };
    const subs = doc.meta?.codeSubmissions ?? (doc.meta?.codeSubmission ? [doc.meta.codeSubmission] : null);
    if (subs) codeSubmissionJson = JSON.stringify(subs);
  } catch {
    /* ignore */
  }

  let jdTitle = 'Target role';
  let jdText = '';
  const jdRes = await fetch(`${GATEWAY}/interviews/jd/${interview.jdId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (jdRes?.ok) {
    const jd = (await jdRes.json()) as { title?: string; text?: string };
    jdTitle = jd.title ?? jdTitle;
    jdText = jd.text ?? '';
  }

  let resumeSummary: string | undefined;
  let rubricJson: string | undefined;
  let candidateProfileJson: string | undefined;
  if (interview.planId) {
    const planRes = await fetch(`${GATEWAY}/interviews/plans/${interview.planId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (planRes?.ok) {
      const plan = (await planRes.json()) as {
        gapMapJson?: string;
        rubricJson?: string;
        candidateProfileJson?: string;
      };
      rubricJson = plan.rubricJson;
      candidateProfileJson = plan.candidateProfileJson;
      try {
        const gap = JSON.parse(plan.gapMapJson ?? '{}') as { resumeSummary?: string };
        resumeSummary = gap.resumeSummary?.trim() || undefined;
      } catch {
        /* ignore */
      }
    }
  }

  return {
    interview,
    assessBody: {
      interviewId,
      jdTitle,
      jdText,
      resumeSummary,
      transcriptJson: interview.transcriptJson,
      rubricJson,
      candidateProfileJson,
      interviewMode: interview.interviewMode ?? 'L3',
      forceRefresh: true,
      ...(codeSubmissionJson ? { codeSubmissionJson } : {}),
    },
  };
}

export async function applyAssessmentResult(
  interviewId: string,
  token: string,
  interview: ReassessInterview,
  assessment: {
    proposedVerdict?: string;
    categoryScores?: {
      dimension: string;
      value: number;
      rationale?: string;
      gap?: string;
      evidence?: string;
    }[];
    technicalKnowledge?: { score?: number; rationale?: string };
    communication?: { score?: number; rationale?: string };
    [key: string]: unknown;
  }
) {
  const assessmentScores = assessment.categoryScores?.length
    ? assessment.categoryScores
    : [
        {
          dimension: 'TechnicalKnowledge',
          value: assessment.technicalKnowledge?.score ?? 1,
          rationale: assessment.technicalKnowledge?.rationale,
        },
        {
          dimension: 'Communication',
          value: assessment.communication?.score ?? 1,
          rationale: assessment.communication?.rationale,
        },
      ];

  if (assessmentScores.length) {
    await fetch(`${GATEWAY}/scores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interviewId,
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
    transcriptDoc = JSON.parse(interview.transcriptJson ?? '{}') as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  const mergedTranscript = JSON.stringify({
    ...transcriptDoc,
    meta: {
      ...(transcriptDoc.meta as object ?? {}),
      aiAssessment: { ...assessment, scoredAt: new Date().toISOString() },
    },
  });

  await fetch(`${GATEWAY}/interviews/${interviewId}/complete`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcriptJson: mergedTranscript,
      proposedVerdict: assessment.proposedVerdict,
      status: 'REVIEW_PENDING',
    }),
  }).catch(() => null);

  return assessment.proposedVerdict ?? '';
}
