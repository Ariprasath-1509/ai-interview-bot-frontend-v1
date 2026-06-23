import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";
import { loadReassessContext } from './reassessUtils';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Start async AI assessment (returns immediately — poll /reassess/status). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ctx = await loadReassessContext(id, session.token);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const asyncRes = await fetch(`${GATEWAY}/ai/assess-async`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ctx.assessBody),
      signal: AbortSignal.timeout(45_000),
    });

    if (!asyncRes.ok) {
      const err = await asyncRes.text().catch(() => 'Failed to queue assessment');
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const asyncData = (await asyncRes.json().catch(() => ({}))) as { runId?: string };

    return NextResponse.json({
      started: true,
      status: 'PROCESSING',
      runId: asyncData.runId ?? null,
      message: 'Assessment queued. Poll status until complete (typically 5–10 minutes with Ollama).',
    });
  } catch (error) {
    console.error('Reassessment start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
