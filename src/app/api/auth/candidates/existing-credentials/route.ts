import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_jwt')?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch('http://localhost:6002/auth/candidates/bulk-download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorResult = await response.json();
      return NextResponse.json({ ok: false, error: errorResult.message || 'Download failed' }, { status: response.status });
    }

    // Forward the file response
    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="existing_credentials_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.xlsx"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Existing credentials download error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}