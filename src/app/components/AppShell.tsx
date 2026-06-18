import { getSession } from "@/lib/session";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { getSidebarItems } from "@/config/roleConfig";
import type { UserRole } from "@/server/roles";
import { formatRoleLabel } from "@/server/roles";
import { StaffSessionProvider } from "@/lib/StaffSessionContext";

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

  let displayRole = formatRoleLabel(role);
  if ((role === "ADMIN" || role === "TESTING_ADMIN") && session?.adminSource) {
    displayRole = `${displayRole} (${session.adminSource})`;
  }

  return (
    <StaffSessionProvider
      session={{
        role,
        branch: session?.branch,
        username: session?.username,
        adminSource: session?.adminSource,
      }}
    >
      <SidebarLayout
        title={title}
        subtitle={subtitle}
        items={items}
        username={session?.username}
        role={displayRole}
        branch={session?.branch && role !== "SUPER_ADMIN" ? session.branch : undefined}
      >
        {children}
      </SidebarLayout>
    </StaffSessionProvider>
  );
}
