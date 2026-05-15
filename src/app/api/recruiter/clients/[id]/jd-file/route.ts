import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GATEWAY}/recruiter/clients/${id}/jd-file`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'JD file not found' }, { status: response.status });
    }

    const buf = await response.arrayBuffer();
    const disposition = response.headers.get('content-disposition');
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    if (disposition) {
      headers.set('Content-Disposition', disposition);
    }
    return new NextResponse(buf, { status: 200, headers });
  } catch (error) {
    console.error('Error downloading client JD:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
