import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward candidateSkillSet and candidateYoe if provided
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    const skillSet = searchParams.get('candidateSkillSet');
    const yoe = searchParams.get('candidateYoe');
    if (skillSet) params.set('candidateSkillSet', skillSet);
    if (yoe) params.set('candidateYoe', yoe);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${GATEWAY}/recruiter/clients/for-interview${qs}`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get clients for interview' }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}