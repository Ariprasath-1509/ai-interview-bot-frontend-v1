import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";
import { isStaffReadRole } from '@/lib/staffRoles';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = 'force-dynamic';
export const maxDuration = 330;

/** Generate AI client evaluation brief on demand (typically 1–3 min with local Ollama). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrRefresh();
  if (!session || !isStaffReadRole(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const response = await fetch(`${GATEWAY}/interviews/${id}/client-brief/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(300_000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || data.message || 'Failed to generate client brief' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'Client brief generation timed out. Try again — the AI may still be finishing.'
        : 'Failed to generate client brief';
    return NextResponse.json({ error: message }, { status: 504 });
  }
}
