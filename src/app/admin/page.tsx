import { AppShell } from "@/app/components/AppShell";
import DashboardClient from "./DashboardClient";

export default function AdminHome() {
  return (
    <AppShell title="Interview Dashboard" subtitle="Real-time analytics and system status.">
      <DashboardClient />
    </AppShell>
  );
}
