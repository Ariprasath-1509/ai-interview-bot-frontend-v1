import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_jwt')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params Promise
    const { candidateId } = await params;
    
    console.log('API Route - candidateId:', candidateId);

    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    // Forward to backend resume service
    const backendFormData = new FormData();
    backendFormData.append('resume', file);

    console.log('Forwarding to backend:', `${GATEWAY}/resumes/upload`);

    const response = await fetch(`${GATEWAY}/resumes/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': candidateId,
        'X-User-Role': 'CANDIDATE'
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Backend error:', error);
      return NextResponse.json({ error: error || 'Upload failed' }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_jwt')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params Promise
    const { candidateId } = await params;

    // Get resume info from backend
    const response = await fetch(`${GATEWAY}/resumes/${candidateId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': candidateId,
        'X-User-Role': 'ADMIN'
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
      }
      const error = await response.text();
      return NextResponse.json({ error: error || 'Failed to get resume' }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Resume fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}