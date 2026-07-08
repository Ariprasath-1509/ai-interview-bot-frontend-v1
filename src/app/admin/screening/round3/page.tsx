import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { Round3QueueClient } from "./Round3QueueClient";

export default async function Round3QueuePage() {
  const session = await getSession();
  const isManager = session?.role === "ADMIN" || session?.role === "TESTING_ADMIN" || session?.role === "SUPER_ADMIN";
  if (!session || !isManager) redirect("/unauthorized");

  return (
    <AppShell title="Round 3 — Managerial" subtitle="Conducted live by a manager; passing onboards the candidate as Under Training">
      <Round3QueueClient />
    </AppShell>
  );
}
