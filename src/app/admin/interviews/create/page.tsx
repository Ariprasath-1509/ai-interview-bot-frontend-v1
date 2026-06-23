import { isStaffReadRole } from '@/lib/staffRoles';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AppShell } from '@/app/components/AppShell';
import { CreateInterviewClient } from './CreateInterviewClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreateInterviewPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isStaffReadRole(session.role)) {
    redirect('/login');
  }

  const params = await searchParams;
  const candidateId = typeof params.candidateId === 'string' ? params.candidateId : undefined;
  const clientId = typeof params.clientId === 'string' ? params.clientId : undefined;

  return (
    <AppShell title="Create Interview" subtitle="Set up a new technical interview">
      <CreateInterviewClient 
        candidateId={candidateId}
        clientId={clientId}
        searchParams={params}
      />
    </AppShell>
  );
}