import { isStaffAdminRole } from '@/lib/staffRoles';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AppShell } from '@/app/components/AppShell';
import ComplianceClient from './ComplianceClient';

export default async function CompliancePage() {
  const session = await getSession();
  if (!session || !isStaffAdminRole(session.role)) {
    redirect('/login');
  }

  return (
    <AppShell
      title="Compliance"
      subtitle="Audit logs and retention policies"
    >
      <ComplianceClient />
    </AppShell>
  );
}
