import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { isStaffReadRole } from '@/lib/staffRoles';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isStaffReadRole(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const response = await fetch(`${GATEWAY}/interviews/${id}/client-brief/download`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });

  if (!response.ok) {
    const errorMsg = response.headers.get('X-Error-Message') || 'Failed to download client brief PDF';
    return NextResponse.json({ error: errorMsg }, { status: response.status });
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? 'Client_Evaluation_Brief.pdf';

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
