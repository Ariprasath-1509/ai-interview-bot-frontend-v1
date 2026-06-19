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

    // Get all active clients
    const response = await fetch(`${GATEWAY}/recruiter/clients`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch clients: ${response.status}`);
    }

    const clients = await response.json();
    
    return NextResponse.json({
      totalClients: Array.isArray(clients) ? clients.length : 0,
      clients: clients || []
    });

  } catch (error) {
    console.error('Error getting clients:', error);
    return NextResponse.json({ 
      totalClients: 0,
      clients: []
    });
  }
}