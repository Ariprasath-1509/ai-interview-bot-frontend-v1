import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function PUT(
  request: NextRequest,
  { params }: { params: { region: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only SUPER_ADMIN can update retention policies' }, { status: 403 });
    }

    const body = await request.json();
    const region = params.region;

    const response = await fetch(
      `http://localhost:6002/compliance/retention-policies/${region}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to update retention policy' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error updating retention policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
