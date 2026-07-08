import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { BatchSummaryClient } from "./BatchSummaryClient";

export default async function BatchSummaryPage({ params }: { params: Promise<{ batchId: string }> }) {
  const session = await getSession();
  if (!session || session.role === "CANDIDATE") redirect("/unauthorized");
  const { batchId } = await params;

  return (
    <AppShell title="Batch Summary" subtitle="Consolidated marks across all 3 rounds and final outcomes">
      <BatchSummaryClient batchId={batchId} />
    </AppShell>
  );
}
