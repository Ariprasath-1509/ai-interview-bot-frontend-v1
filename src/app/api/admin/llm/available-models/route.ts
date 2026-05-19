import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { apiServer } from '@/lib/apiClient';

export async function GET() {
  const session = await getSession();
  
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const response = await apiServer('/admin/llm/available-models', session.token);
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch available models:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
