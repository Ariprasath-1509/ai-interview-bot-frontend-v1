import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all clients with matching overview
    const [overviewResponse, allClientsResponse] = await Promise.all([
      fetch('http://localhost:6002/clients/matching/overview', {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch('http://localhost:6002/recruiter/clients', {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    let totalClients = 0;
    let totalMatchingCandidates = 0;
    let clientsWithMatches = 0;

    // Get total clients count from direct clients endpoint
    if (allClientsResponse.ok) {
      const allClients = await allClientsResponse.json();
      totalClients = Array.isArray(allClients) ? allClients.length : 0;
    }

    // Get matching data from overview endpoint
    if (overviewResponse.ok) {
      const overviewData = await overviewResponse.json();
      const clients = overviewData.clients || [];
      
      // Count matching candidates across all clients
      for (const client of clients) {
        const benchMatches = client.benchB2bSummary?.totalMatches || 0;
        const marketMatches = client.marketSummary?.totalMatches || 0;
        const clientTotalMatches = benchMatches + marketMatches;
        
        totalMatchingCandidates += clientTotalMatches;
        
        if (clientTotalMatches > 0) {
          clientsWithMatches++;
        }
      }
    }

    const averageMatchesPerClient = totalClients > 0 ? 
      Math.round((totalMatchingCandidates / totalClients) * 10) / 10 : 0;

    return NextResponse.json({
      totalClients,
      totalMatchingCandidates,
      clientsWithMatches,
      averageMatchesPerClient
    });

  } catch (error) {
    console.error('Error getting client analytics:', error);
    return NextResponse.json({ 
      totalClients: 0, 
      totalMatchingCandidates: 0,
      clientsWithMatches: 0,
      averageMatchesPerClient: 0
    });
  }
}