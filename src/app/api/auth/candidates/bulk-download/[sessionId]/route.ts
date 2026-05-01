import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('br_jwt')?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const response = await fetch(`http://localhost:6002/auth/candidates/bulk-download/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorResult = await response.json();
      return NextResponse.json({ ok: false, error: errorResult.message || 'Download failed' }, { status: response.status });
    }

    // Forward the file response
    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="login_credentials_${sessionId}.xlsx"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}