import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

interface PageProps {
  params: Promise<{ candidateId: string }>;
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId } = await params;

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    // Get all clients with matching overview to find which ones have this candidate
    const response = await fetch(`${GATEWAY}/clients/matching/overview`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to get matching overview:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to get matching data' }, { status: response.status });
    }

    const overviewData = await response.json();
    const matchingClients = [];

    // Check each client for matches with this candidate
    for (const client of overviewData.clients || []) {
      try {
        // Get detailed matches for each source (BENCH_B2B and MARKET)
        const sources = ['BENCH_B2B', 'MARKET'];
        
        for (const source of sources) {
          const matchResponse = await fetch(`${GATEWAY}/clients/matching/${client.clientId}?source=${source}`, {
            headers: {
              'Authorization': `Bearer ${session.token}`,
              'Content-Type': 'application/json'
            }
          });

          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            
            // Check if this candidate is in the matches
            const candidateMatch = matchData.matches?.find((match: any) => match.candidateId === candidateId);
            
            if (candidateMatch) {
              // Get full client details from the backend
              const clientDetailResponse = await fetch(`${GATEWAY}/recruiter/clients/${client.clientId}`, {
                headers: {
                  'Authorization': `Bearer ${session.token}`,
                  'Content-Type': 'application/json'
                }
              });

              let clientDetails = {
                id: client.clientId,
                clientName: client.clientName,
                jdRole: client.jdRole,
                jdText: '',
                focusAreas: ''
              };

              if (clientDetailResponse.ok) {
                const fullClientData = await clientDetailResponse.json();
                clientDetails = {
                  id: client.clientId,
                  clientName: fullClientData.clientName || client.clientName,
                  jdRole: fullClientData.jdRole || client.jdRole,
                  jdText: fullClientData.jdDescription || '',
                  focusAreas: fullClientData.focusAreas || ''
                };
              }

              matchingClients.push({
                ...clientDetails,
                matchScore: candidateMatch.matchScore,
                recommendation: candidateMatch.recommendation
              });
              break; // Found match, no need to check other sources for this client
            }
          }
        }
      } catch (error) {
        console.error(`Error checking matches for client ${client.clientId}:`, error);
        // Continue with other clients
      }
    }

    return NextResponse.json({
      candidateId,
      matches: matchingClients
    });

  } catch (error) {
    console.error('Error getting matching clients for candidate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}