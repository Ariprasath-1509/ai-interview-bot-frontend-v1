import { AppShell } from "@/app/components/AppShell";
import { CalendarClient } from "./CalendarClient";

export default function CalendarPage() {
  return (
    <AppShell title="Interview Calendar" subtitle="View scheduled interviews by date.">
      <CalendarClient />
    </AppShell>
  );
}
