import { AppShell } from "@/app/components/AppShell";
import CandidatesClient from "./CandidatesClient";
import { getSession } from "@/lib/session";

export default async function CandidatesPage() {
  const session = await getSession();
  return (
    <AppShell title="Candidates" subtitle="View and manage all registered candidates.">
      <CandidatesClient role={session?.role ?? 'ADMIN'} />
    </AppShell>
  );
}
