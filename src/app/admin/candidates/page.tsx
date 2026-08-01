import { AppShell } from "@/app/components/AppShell";
import CandidatesClient from "./CandidatesClient";
import { getSession } from "@/lib/session";
import { getEnabledFeatures } from "@/lib/orgFeatures";

export default async function CandidatesPage() {
  const session = await getSession();
  const features = await getEnabledFeatures(session ?? null);
  return (
    <AppShell title="Candidates" subtitle="View and manage all registered candidates.">
      <CandidatesClient role={session?.role ?? 'ADMIN'} features={features} />
    </AppShell>
  );
}
