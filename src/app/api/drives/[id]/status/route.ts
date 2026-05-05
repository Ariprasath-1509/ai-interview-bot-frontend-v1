import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    
    const response = await fetch(`${GATEWAY}/drives/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return new NextResponse('Failed to update status', { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Status update error:', error);
    return new NextResponse('Service unavailable', { status: 503 });
  }
}
