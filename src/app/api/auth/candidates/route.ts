import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Build URL with search parameter only if provided
    const url = search 
      ? `http://localhost:6002/auth/candidates?search=${encodeURIComponent(search)}`
      : `http://localhost:6002/auth/candidates`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
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