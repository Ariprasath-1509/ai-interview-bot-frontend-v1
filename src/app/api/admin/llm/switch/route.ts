import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { apiServer } from '@/lib/apiClient';

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    const response = await apiServer('/admin/llm/switch', session.token, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to switch LLM provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
