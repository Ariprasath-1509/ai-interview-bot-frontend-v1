import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission, getSidebarItems } from "@/config/roleConfig";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "tokens.manage")) redirect("/admin");

  return (
    <SidebarLayout
      title="Settings"
      subtitle="Manage tokens, proctoring, and AI routing"
      items={getSidebarItems(session.role)}
      username={session.username}
      role={session.role}
    >
      <SettingsClient />
    </SidebarLayout>
  );
}
