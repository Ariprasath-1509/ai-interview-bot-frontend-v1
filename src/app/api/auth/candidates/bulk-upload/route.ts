import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_jwt')?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    // Forward the file to the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const response = await fetch('http://localhost:6002/auth/candidates/bulk-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: backendFormData,
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: result.message || 'Upload failed' }, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}