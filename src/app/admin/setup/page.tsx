import { AppShell } from "@/app/components/AppShell";
import InterviewSetupClient from "./SetupClient";

export default function AdminSetupPage() {
  return (
    <AppShell title="Create Interview" subtitle="Setup a new technical interview with customized mode and duration.">
      <InterviewSetupClient />
    </AppShell>
  );
}
