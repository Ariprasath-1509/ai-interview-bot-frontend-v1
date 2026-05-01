import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SidebarLayout } from '@/components/common/SidebarLayout';
import { getAdminSidebarItems } from '@/config/roleConfig';
import ComplianceClient from './ComplianceClient';

export default async function CompliancePage() {
  const session = await getSession();
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    redirect('/login');
  }

  return (
    <SidebarLayout
      title="Compliance"
      subtitle="Audit logs and retention policies"
      items={getAdminSidebarItems()}
      username={session.username}
      role={session.role}
    >
      <ComplianceClient />
    </SidebarLayout>
  );
}
