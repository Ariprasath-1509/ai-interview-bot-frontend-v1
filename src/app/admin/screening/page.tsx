import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { ScreeningHomeClient } from "./ScreeningHomeClient";

export default async function ScreeningPage() {
  const session = await getSession();
  if (!session || session.role === "CANDIDATE") redirect("/unauthorized");

  return (
    <AppShell title="Screening" subtitle="Round 1 written tests, plus Round 2/3 pipeline tracking">
      <ScreeningHomeClient isManager={session.role === "ADMIN" || session.role === "TESTING_ADMIN" || session.role === "SUPER_ADMIN"} />
    </AppShell>
  );
}
