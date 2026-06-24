import { isStaffReadRole } from '@/lib/staffRoles';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const { id, positionId } = await params;
    const session = await getSessionOrRefresh();
    if (!session || !isStaffReadRole(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(
      `${GATEWAY}/recruiter/clients/${id}/positions/${positionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to delete position' }, { status: response.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
