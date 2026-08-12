import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const response = await fetch(`${GATEWAY}/recruiter/clients/${id}/screening-checklist`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Failed to update screening checklist:', response.status, response.statusText);
      const err = await response.json().catch(() => null);
      return NextResponse.json(
        { error: typeof err?.error === 'string' ? err.error : 'Failed to update screening checklist' },
        { status: response.status },
      );
    }

    const client = await response.json();
    return NextResponse.json(client);
  } catch (error) {
    console.error('Error updating screening checklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
