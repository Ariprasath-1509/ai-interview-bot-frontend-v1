import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiServer } from '@/lib/apiClient';
import { isStaffAdminRole } from '@/lib/staffRoles';
import { AppShell } from '@/app/components/AppShell';
import { EditInterviewClient } from './EditInterviewClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface InterviewData {
  id: string;
  status: string;
  jdId?: string;
  interviewMode?: string;
  customDurationMinutes?: number | null;
  roundName?: string;
  includeProgrammingQuestions?: boolean;
  scheduledAt?: string | null;
  expiresAt?: string | null;
}

export default async function EditInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.token || !isStaffAdminRole(session.role)) {
    redirect('/admin');
  }

  const interviewRes = await apiServer(`/interviews/${id}`, session.token);

  if (!interviewRes.ok) {
    redirect('/admin');
  }

  const interview = (await interviewRes.json()) as InterviewData;

  if (interview.status !== 'DRAFT' && interview.status !== 'SCHEDULED' && interview.status !== 'EXPIRED') {
    redirect(`/admin/interviews/${id}/review`);
  }

  let jdData: { title?: string; text?: string; focusAreas?: string } = {};
  if (interview.jdId) {
    try {
      const jdRes = await apiServer(`/interviews/jd/${interview.jdId}`, session.token);
      if (jdRes.ok) jdData = await jdRes.json();
    } catch { /* ignore */ }
  }

  const initialData = {
    jdTitle: jdData.title,
    jdText: jdData.text,
    focusAreas: jdData.focusAreas,
    interviewMode: interview.interviewMode,
    customDurationMinutes: interview.customDurationMinutes,
    roundName: interview.roundName,
    includeProgrammingQuestions: interview.includeProgrammingQuestions,
    scheduledAt: interview.scheduledAt,
    expiresAt: interview.expiresAt,
  };

  return (
    <AppShell title="Edit interview">
      <EditInterviewClient interviewId={id} isExpired={interview.status === 'EXPIRED'} initialData={initialData} />
    </AppShell>
  );
}
