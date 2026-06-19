import { NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";

export const dynamic = 'force-dynamic';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionOrRefresh();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const response = await fetch(`${GATEWAY}/drives/${id}/analytics`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch analytics', { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return new NextResponse('Service unavailable', { status: 503 });
  }
}
