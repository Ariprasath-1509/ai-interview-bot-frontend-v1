import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isStaffReadRole } from "@/lib/staffRoles";
import { AppShell } from "@/app/components/AppShell";
import { BulkCreateClient } from "./BulkCreateClient";

export const dynamic = "force-dynamic";

export default async function BulkCreatePage() {
  const session = await getSession();
  if (!session || !isStaffReadRole(session.role)) redirect("/login");
  return (
    <AppShell title="Bulk Create Interviews" subtitle="Generate multiple evaluation links simultaneously">
      <BulkCreateClient />
    </AppShell>
  );
}
