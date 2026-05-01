import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('br_jwt')?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const response = await fetch(`http://localhost:6002/auth/candidates/bulk-confirm/${sessionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: result.message || 'Confirmation failed' }, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk confirm error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}