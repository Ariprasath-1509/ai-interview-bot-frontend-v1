import { isStaffAdminRole } from '@/lib/staffRoles';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AppShell } from '@/app/components/AppShell';
import DeploymentBulkImportClient from './DeploymentBulkImportClient';

export default async function DeploymentBulkImportPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  if (!isStaffAdminRole(session.role)) {
    redirect('/dashboard');
  }

  return (
    <AppShell title="Deployment Bulk Import" subtitle="Import deployment data from Excel">
      <DeploymentBulkImportClient />
    </AppShell>
  );
}
