import { getSession } from "@/lib/session";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { getSidebarItems } from "@/config/roleConfig";
import type { UserRole } from "@/server/roles";

export async function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const session = await getSession();
  const role = (session?.role ?? "CANDIDATE") as UserRole;
  const items = getSidebarItems(role);

  const displayRole = role === "ADMIN" && session?.adminSource
    ? `${role} (${session.adminSource})`
    : role;

  return (
    <SidebarLayout
      title={title}
      subtitle={subtitle}
      items={items}
      username={session?.username}
      role={displayRole}
    >
      {children}
    </SidebarLayout>
  );
}
