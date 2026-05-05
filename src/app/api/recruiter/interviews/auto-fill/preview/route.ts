import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_jwt')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const clientId = searchParams.get('clientId');
    
    const queryString = new URLSearchParams();
    if (candidateId) queryString.append('candidateId', candidateId);
    if (clientId) queryString.append('clientId', clientId);

    const response = await fetch(
      `${process.env.BACKEND_URL || `${GATEWAY}`}/interviews/auto-fill/preview?${queryString.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Auto-fill preview API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}