import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { applyAssessmentResult, loadReassessContext } from '../reassessUtils';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const statusRes = await fetch(`${GATEWAY}/ai/assess-status/${id}`, {
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
    });
  } catch (error) {
    console.error('Reassessment status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Apply completed assessment to scores + interview transcript. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const statusRes = await fetch(`${GATEWAY}/ai/assess-status/${id}`, {
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
