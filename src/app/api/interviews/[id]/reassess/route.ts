import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const maxDuration = 120; // Allow up to 2 minutes for reassessment

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the interview to get transcript and JD info
    const interviewRes = await fetch(`${GATEWAY}/interviews/${id}`, {
      headers: { 'Authorization': `Bearer ${session.token}` }
    });
    if (!interviewRes.ok) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }
    const interview = await interviewRes.json() as {
      id: string; jdId: string; planId: string | null;
      transcriptJson: string | null; interviewMode?: string;
    };

    if (!interview.transcriptJson) {
      return NextResponse.json({ error: 'No transcript available for this interview' }, { status: 400 });
    }

    // Fetch JD
    let jdTitle = 'Target role';
    let jdText = '';
    const jdRes = await fetch(`${GATEWAY}/interviews/jd/${interview.jdId}`, {
      headers: { 'Authorization': `Bearer ${session.token}` }
    }).catch(() => null);
    if (jdRes?.ok) {
      const jd = await jdRes.json() as { title?: string; text?: string };
      jdTitle = jd.title ?? jdTitle;
      jdText = jd.text ?? '';
    }

    // Fetch plan for rubric and candidate profile
    let resumeSummary: string | undefined;
    let rubricJson: string | undefined;
    let candidateProfileJson: string | undefined;
    if (interview.planId) {
      const planRes = await fetch(`${GATEWAY}/interviews/plans/${interview.planId}`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      }).catch(() => null);
      if (planRes?.ok) {
        const plan = await planRes.json() as { gapMapJson?: string; rubricJson?: string; candidateProfileJson?: string };
        rubricJson = plan.rubricJson;
        candidateProfileJson = plan.candidateProfileJson;
        try {
          const gap = JSON.parse(plan.gapMapJson ?? '{}') as { resumeSummary?: string };
          resumeSummary = gap.resumeSummary?.trim() || undefined;
        } catch {}
      }
    }

    // Call AI assessment
    const assessRes = await fetch(`${GATEWAY}/ai/assess`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        interviewId: id,
        jdTitle,
        jdText,
        resumeSummary,
        transcriptJson: interview.transcriptJson,
        rubricJson,
        candidateProfileJson,
        interviewMode: interview.interviewMode ?? 'L3'
      })
    });

    if (!assessRes.ok) {
      const err = await assessRes.text().catch(() => 'Assessment failed');
      return NextResponse.json({ error: `Assessment failed: ${err}` }, { status: 500 });
    }

    const assessment = await assessRes.json() as {
      proposedVerdict: string;
      categoryScores?: { dimension: string; value: number; rationale?: string; gap?: string; evidence?: string }[];
      [key: string]: any;
    };

    // Save updated scores
    if (assessment.categoryScores?.length) {
      await fetch(`${GATEWAY}/scores`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interviewId: id,
          scores: assessment.categoryScores.map(s => ({
            dimension: s.dimension,
            value: s.value,
            rationale: s.rationale,
            evidence: s.evidence,
            gap: s.gap
          }))
        })
      }).catch(() => null);
    }

    // Update interview with new assessment in transcript meta
    let transcriptDoc: Record<string, unknown> = {};
    try { transcriptDoc = JSON.parse(interview.transcriptJson) as Record<string, unknown>; } catch {}
    const mergedTranscript = JSON.stringify({
      ...transcriptDoc,
      meta: { ...(transcriptDoc.meta as object ?? {}), aiAssessment: { ...assessment, scoredAt: new Date().toISOString() } }
    });

    await fetch(`${GATEWAY}/interviews/${id}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcriptJson: mergedTranscript,
        proposedVerdict: assessment.proposedVerdict,
        status: 'REVIEW_PENDING'
      })
    }).catch(() => null);

    return NextResponse.json({ success: true, verdict: assessment.proposedVerdict });
  } catch (error) {
    console.error('Reassessment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
