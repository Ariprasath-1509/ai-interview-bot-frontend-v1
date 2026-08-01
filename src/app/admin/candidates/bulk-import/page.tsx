import { isStaffAdminRole } from '@/lib/staffRoles';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getEnabledFeatures } from '@/lib/orgFeatures';
import { AppShell } from '@/app/components/AppShell';
import BulkImportClient from './BulkImportClient';

export default async function BulkImportPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  if (!isStaffAdminRole(session.role)) {
    redirect('/dashboard');
  }

  const features = await getEnabledFeatures(session);

  return (
    <AppShell title="Bulk Import" subtitle="Import candidates from Excel">
      <BulkImportClient userRole={session.role} userBranch={session.branch} clientsEnabled={features.CLIENTS !== false} />
    </AppShell>
  );
}