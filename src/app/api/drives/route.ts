import { NextResponse } from 'next/server';
import { getSessionOrRefresh } from '@/lib/session';

export const dynamic = 'force-dynamic';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET() {
  const session = await getSessionOrRefresh();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const response = await fetch(`${GATEWAY}/drives`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return new NextResponse('Backend error', { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Drives fetch error:', error);
    return new NextResponse('Service unavailable', { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    
    const response = await fetch(`${GATEWAY}/drives`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create drive' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Drive creation error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
