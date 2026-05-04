import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002';

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

    // Download resume from backend
    const response = await fetch(`${GATEWAY}/resumes/${candidateId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
      }
      const error = await response.text();
      return NextResponse.json({ error: error || 'Download failed' }, { status: response.status });
    }

    // Get the file blob and headers
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || 'attachment; filename="resume.pdf"';

    // Return the file
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });

  } catch (error) {
    console.error('Resume download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}