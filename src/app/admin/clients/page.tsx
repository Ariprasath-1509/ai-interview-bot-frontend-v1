import { AppShell } from "@/app/components/AppShell";
import ClientsClient from "./ClientsClient";

export default function ClientsPage() {
  return (
    <AppShell title="Client Management" subtitle="Manage client companies and their job positions.">
      <ClientsClient />
    </AppShell>
  );
}