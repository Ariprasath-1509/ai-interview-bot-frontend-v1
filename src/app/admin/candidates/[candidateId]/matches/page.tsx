import { AppShell } from '@/app/components/AppShell';
import CandidateMatchesClient from './CandidateMatchesClient';

export default async function CandidateMatchesPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  
  return (
    <AppShell title="Candidate Client Matches">
      <CandidateMatchesClient candidateId={candidateId} />
    </AppShell>
  );
}