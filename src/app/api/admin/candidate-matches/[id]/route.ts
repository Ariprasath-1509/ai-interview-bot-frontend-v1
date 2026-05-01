import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: candidateId } = await params;

    const clientsRes = await fetch('http://localhost:6002/recruiter/clients', {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clientsRes.ok) {
      return NextResponse.json({ matches: [] });
    }

    const clients = await clientsRes.json();
    const matches = [];

    for (const client of clients) {
      try {
        const matchRes = await fetch(
          `http://localhost:6002/clients/matching/${client.id}?source=BENCH_B2B`,
          {
            headers: {
              'Authorization': `Bearer ${session.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (matchRes.ok) {
          const matchData = await matchRes.json();
          const candidateMatch = matchData.matches?.find(
            (m: any) => m.candidateId === candidateId
          );

          if (candidateMatch) {
            matches.push({
              clientId: client.id,
              clientName: client.clientName,
              jdRole: client.jdRole,
              matchScore: candidateMatch.matchScore,
              recommendation: candidateMatch.recommendation
            });
          }
        }
      } catch (error) {
        console.error(`Error checking match for client ${client.id}:`, error);
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ matches });

  } catch (error) {
    console.error('Error getting candidate matches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
