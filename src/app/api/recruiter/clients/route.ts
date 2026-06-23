import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let backendUrl = `${GATEWAY}/recruiter/clients`;
    if (search) {
      backendUrl += `?search=${encodeURIComponent(search)}`;
    }

    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to get clients:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to get clients' }, { status: response.status });
    }

    const clients = await response.json();
    return NextResponse.json(clients);

  } catch (error) {
    console.error('Error getting clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart — forward as multipart to backend
      const formData = await request.formData();
      const clientJson = formData.get('client') as string;
      const jdFile = formData.get('jdFile') as File | null;

      const backendForm = new FormData();
      backendForm.append('client', clientJson);
      if (jdFile) {
        backendForm.append('jdFile', jdFile);
      }

      const response = await fetch(`${GATEWAY}/recruiter/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
        body: backendForm
      });

      if (!response.ok) {
        console.error('Failed to create client:', response.status, response.statusText);
        return NextResponse.json({ error: 'Failed to create client' }, { status: response.status });
      }

      const client = await response.json();
      return NextResponse.json(client);
    } else {
      // Handle JSON — backward compatible
      const body = await request.json();

      const response = await fetch(`${GATEWAY}/recruiter/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error('Failed to create client:', response.status, response.statusText);
        return NextResponse.json({ error: 'Failed to create client' }, { status: response.status });
      }

      const client = await response.json();
      return NextResponse.json(client);
    }
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
