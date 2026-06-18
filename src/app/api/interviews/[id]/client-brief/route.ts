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
  const response = await fetch(`${GATEWAY}/interviews/${id}/client-brief`, {
    headers: { Authorization: `Bearer ${session.token}` },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: data.error || 'Failed to load client brief' }, { status: response.status });
  }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isStaffReadRole(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const response = await fetch(`${GATEWAY}/interviews/${id}/client-brief`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json',
      'X-User-Name': session.username ?? 'Staff',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: data.error || 'Failed to save client brief' }, { status: response.status });
  }
  return NextResponse.json(data);
}
