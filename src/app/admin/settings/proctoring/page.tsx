import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/config/roleConfig";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { getSidebarItems } from "@/config/roleConfig";
import ProctoringSettingsClient from "./ProctoringSettingsClient";

export default async function ProctoringSettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session.role, "tokens.manage")) {
    redirect("/admin");
  }

  return (
    <SidebarLayout
      title="Proctoring Settings"
      subtitle="Enable or disable video proctoring per candidate source"
      items={getSidebarItems(session.role)}
      username={session.username}
      role={session.role}
    >
      <ProctoringSettingsClient />
    </SidebarLayout>
  );
}
