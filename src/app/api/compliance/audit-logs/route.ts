import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      console.log('[API] Unauthorized access attempt to audit logs');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '0';
    const size = searchParams.get('size') || '50';

    console.log(`[API] Fetching audit logs: page=${page}, size=${size}`);
    const url = `${GATEWAY}/compliance/audit-logs?page=${page}&size=${size}`;
    console.log('[API] Calling:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[API] Gateway response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Gateway error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: response.status });
    }

    const data = await response.json();
    console.log('[API] Received data:', JSON.stringify(data).substring(0, 200));
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
