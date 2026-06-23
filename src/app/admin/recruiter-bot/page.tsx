import { AppShell } from "@/app/components/AppShell";
import RecruiterBotClient from "./RecruiterBotClient";

export default function RecruiterBotPage() {
  return (
    <AppShell title="JD Assistant" subtitle="Ask questions about client job descriptions using AI.">
      <RecruiterBotClient />
    </AppShell>
  );
}
