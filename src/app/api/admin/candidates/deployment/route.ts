import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GATEWAY}/auth/candidates/deployed`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch deployed candidates' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching deployed candidates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
