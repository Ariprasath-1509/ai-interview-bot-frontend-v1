import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Public access - no auth required for viewing drive details
  try {
    const { id } = await params;
    const response = await fetch(`${GATEWAY}/drives/${id}`);

    if (!response.ok) {
      return new NextResponse('Drive not found', { status: 404 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Drive fetch error:', error);
    return new NextResponse('Service unavailable', { status: 503 });
  }
}

export async function PUT(
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
    
    const response = await fetch(`${GATEWAY}/drives/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return new NextResponse('Failed to update drive', { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Drive update error:', error);
    return new NextResponse('Service unavailable', { status: 503 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const response = await fetch(`${GATEWAY}/drives/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    });

    if (!response.ok) {
      return new NextResponse('Failed to delete drive', { status: response.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Drive deletion error:', error);
    return new NextResponse('Service unavailable', { status: 503 });
  }
}
