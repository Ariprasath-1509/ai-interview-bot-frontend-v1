import { getSession } from "@/lib/session";
import { AppShellClient } from "./AppShellClient";

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
  const role = session?.role ?? null;

  const links = [
    { href: "/admin", label: "Dashboard", show: role === "BENCH_MANAGER" || role === "INTERVIEWER" || role === "HR" },
    { href: "/admin/setup", label: "Setup", show: role === "BENCH_MANAGER" },
    { href: "/admin/review", label: "Review", show: role === "BENCH_MANAGER" },
    { href: "/admin/staff", label: "Manage Staff", show: role === "BENCH_MANAGER" },
    { href: "/admin/settings/tokens", label: "Token Settings", show: role === "BENCH_MANAGER" },
    { href: "/compliance", label: "Compliance", show: role === "COMPLIANCE" },
  ]
    .filter((l) => l.show)
    .map(({ href, label }) => ({ href, label }));

  return (
    <AppShellClient
      title={title}
      subtitle={subtitle}
      links={links}
      username={session?.username}
      role={session?.role}
    >
      {children}
    </AppShellClient>
  );
}
