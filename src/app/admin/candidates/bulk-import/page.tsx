import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AppShell } from '@/app/components/AppShell';
import BulkImportClient from './BulkImportClient';

export default async function BulkImportPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    redirect('/dashboard');
  }

  return (
    <AppShell title="Bulk Import" subtitle="Import candidates from Excel">
      <BulkImportClient />
    </AppShell>
  );
}