import { AppShell } from '@/app/components/AppShell';
import ReportDownloadClient from './ReportDownloadClient';

export default function ReportsPage() {
  return (
    <AppShell
      title="Management Reports"
      subtitle="Download professional PDF reports for any date range — pipeline, verdicts, trends, and AI cost."
    >
      <ReportDownloadClient />
    </AppShell>
  );
}
