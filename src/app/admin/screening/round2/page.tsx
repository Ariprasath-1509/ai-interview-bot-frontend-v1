import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { Round2QueueClient } from "./Round2QueueClient";

export default async function Round2QueuePage() {
  const session = await getSession();
  if (!session || session.role === "CANDIDATE") redirect("/unauthorized");

  return (
    <AppShell title="Round 2 — F2F Technical" subtitle="Conducted live; record feedback once you've met the candidate">
      <Round2QueueClient />
    </AppShell>
  );
}
