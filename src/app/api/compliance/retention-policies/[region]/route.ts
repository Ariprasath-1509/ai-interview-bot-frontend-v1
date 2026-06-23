import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ region: string }> }
) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only SUPER_ADMIN can update retention policies' }, { status: 403 });
    }

    const body = await request.json();
    const { region } = await params;

    const response = await fetch(
      `${GATEWAY}/compliance/retention-policies/${region}`,
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
