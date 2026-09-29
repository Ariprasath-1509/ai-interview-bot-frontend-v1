import { isStaffAdminRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ region: string }> }
) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { region } = await params;

    const response = await fetch(
      `${GATEWAY}/compliance/retention-policies/${encodeURIComponent(region)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      let errorMsg = 'Failed to update retention policy';
      try {
        const errJson = await response.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const data = await response.json().catch(() => ({ success: true }));
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error updating retention policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
