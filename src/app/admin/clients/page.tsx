import { AppShell } from "@/app/components/AppShell";
import { getSession } from "@/lib/session";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage() {
  const session = await getSession();
  const role = session?.role ?? "CANDIDATE";
  return (
    <AppShell title="Client Management" subtitle="Manage client companies and their job positions.">
      <ClientsClient userRole={role} userBranch={session?.branch} />
    </AppShell>
  );
}