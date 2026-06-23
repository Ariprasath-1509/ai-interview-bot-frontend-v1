import { NextResponse } from 'next/server';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Public endpoint - no authentication required
  try {
    const { id } = await params;
    const body = await req.json();
    
    const response = await fetch(`${GATEWAY}/drives/${id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 503 }
    );
  }
}
