import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${GATEWAY}/recruiter/bot/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in recruiter bot query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
