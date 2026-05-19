import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AppShell } from '@/app/components/AppShell';
import LlmConfigClient from './LlmConfigClient';

export default async function LlmConfigPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized');
  }

  return (
    <AppShell title="LLM Configuration" subtitle="Switch between Claude and Ollama providers and configure models.">
      <LlmConfigClient />
    </AppShell>
  );
}
