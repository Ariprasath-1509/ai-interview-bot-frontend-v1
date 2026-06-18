import { isStaffReadRole, isStaffAdminRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GATEWAY}/recruiter/clients/${id}`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to get client:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to get client' }, { status: response.status });
    }

    const client = await response.json();
    return NextResponse.json(client);

  } catch (error) {
    console.error('Error getting client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let response: Response;
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const clientPart = formData.get('client');
      if (typeof clientPart !== 'string') {
        return NextResponse.json({ error: 'Invalid multipart payload: missing client JSON part' }, { status: 400 });
      }
      const backendForm = new FormData();
      backendForm.append('client', clientPart);
      const jdFile = formData.get('jdFile');
      if (jdFile instanceof File && jdFile.size > 0) {
        backendForm.append('jdFile', jdFile);
      }
      response = await fetch(`${GATEWAY}/recruiter/clients/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body: backendForm,
      });
    } else {
      const body = await request.json();
      response = await fetch(`${GATEWAY}/recruiter/clients/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      console.error('Failed to update client:', response.status, response.statusText);
      const err = await response.json().catch(() => null);
      return NextResponse.json(
        { error: typeof err?.error === 'string' ? err.error : 'Failed to update client' },
        { status: response.status },
      );
    }

    const client = await response.json();
    return NextResponse.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GATEWAY}/recruiter/clients/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to delete client:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: response.status });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}