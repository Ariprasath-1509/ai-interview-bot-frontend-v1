import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";
import { applyAssessmentResult, loadReassessContext } from '../reassessUtils';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const runId = request.nextUrl.searchParams.get('runId');
    const statusUrl = runId
      ? `${GATEWAY}/ai/assess-status/${id}?runId=${encodeURIComponent(runId)}`
      : `${GATEWAY}/ai/assess-status/${id}`;

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: 'no-store',
    });

    if (!statusRes.ok) {
      return NextResponse.json({ status: 'NOT_FOUND' });
    }

    const status = (await statusRes.json()) as {
      status?: string;
      result?: Record<string, unknown>;
      error?: string;
    };

    return NextResponse.json({
      status: status.status ?? 'NOT_FOUND',
      error: status.error,
      hasResult: Boolean(status.result),
      runId: (status as { runId?: string }).runId ?? null,
    });
  } catch (error) {
    console.error('Reassessment status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Apply completed assessment to scores + interview transcript. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const expectedRunId = typeof body.runId === 'string' ? body.runId : null;

    const statusUrl = expectedRunId
      ? `${GATEWAY}/ai/assess-status/${id}?runId=${encodeURIComponent(expectedRunId)}`
      : `${GATEWAY}/ai/assess-status/${id}`;

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: 'no-store',
    });

    if (!statusRes.ok) {
      return NextResponse.json({ error: 'Assessment status unavailable' }, { status: 404 });
    }

    const status = (await statusRes.json()) as {
      status?: string;
      result?: Record<string, unknown>;
      error?: string;
    };

    if (status.status === 'FAILED') {
      return NextResponse.json({ error: status.error ?? 'Assessment failed' }, { status: 500 });
    }
    if (status.status !== 'COMPLETED' || !status.result) {
      return NextResponse.json({ error: 'Assessment not complete yet' }, { status: 409 });
    }

    const statusRunId = (status as { runId?: string }).runId;
    if (expectedRunId && statusRunId && statusRunId !== expectedRunId) {
      return NextResponse.json({ error: 'Assessment result is from a previous run — still processing' }, { status: 409 });
    }

    const ctx = await loadReassessContext(id, session.token);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const verdict = await applyAssessmentResult(
      id,
      session.token,
      ctx.interview,
      status.result as Parameters<typeof applyAssessmentResult>[3]
    );

    return NextResponse.json({ success: true, verdict, status: 'COMPLETED' });
  } catch (error) {
    console.error('Reassessment apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
