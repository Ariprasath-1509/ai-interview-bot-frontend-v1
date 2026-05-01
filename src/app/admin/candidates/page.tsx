import { AppShell } from "@/app/components/AppShell";
import CandidatesClient from "./CandidatesClient";

export default function CandidatesPage() {
  return (
    <AppShell title="Candidates" subtitle="View and manage all registered candidates.">
      <CandidatesClient />
    </AppShell>
  );
}
