import { isStaffAdminRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GATEWAY}/compliance/retention-policies`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch retention policies' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching retention policies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
