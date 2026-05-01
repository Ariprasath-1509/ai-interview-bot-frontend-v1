import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // If no search parameter, return all clients
    let backendUrl = 'http://localhost:6002/recruiter/clients';
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
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch('http://localhost:6002/recruiter/clients', {
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

  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}