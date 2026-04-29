import { AppShell } from "@/app/components/AppShell";
import TokenSettingsClient from "./TokenSettingsClient";

export default function TokenSettingsPage() {
  return (
    <AppShell title="Token Management" subtitle="Manage API usage and limits for Claude integration.">
      <TokenSettingsClient />
    </AppShell>
  );
}
