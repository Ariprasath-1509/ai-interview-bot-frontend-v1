import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRefresh();
    if (!session || session.role !== 'CANDIDATE') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidateId = session.userId;

    const clientsRes = await fetch(`${GATEWAY}/recruiter/clients`, {
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
          `${GATEWAY}/clients/matching/${client.id}?source=BENCH_B2B`,
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
