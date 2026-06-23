import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const url = search
      ? `${GATEWAY}/auth/candidates?search=${encodeURIComponent(search)}`
      : `${GATEWAY}/auth/candidates`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to search candidates:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to search candidates' }, { status: response.status });
    }

    const candidates = await response.json();
    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Error searching candidates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${GATEWAY}/auth/candidates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json',
        'X-User-Id': session.userId ?? '',
        'X-User-Role': session.role,
        'X-User-Email': session.username ?? '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error ?? 'Failed to create candidate' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating candidate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
