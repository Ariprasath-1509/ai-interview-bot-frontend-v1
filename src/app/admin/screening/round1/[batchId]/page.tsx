import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { Round1ReviewClient } from "./Round1ReviewClient";

export default async function Round1ReviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const session = await getSession();
  if (!session || session.role === "CANDIDATE") redirect("/unauthorized");
  const { batchId } = await params;

  return (
    <AppShell title="Round 1 Review" subtitle="Mark who passed the written round">
      <Round1ReviewClient batchId={batchId} />
    </AppShell>
  );
}
