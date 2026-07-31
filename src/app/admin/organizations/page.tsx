import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { apiServer } from "@/lib/apiClient";
import { OrgDirectoryTable } from "./OrgDirectoryTable";
import { CreateOrgPanel } from "./CreateOrgPanel";
import type { OrgRow } from "./types";

export default async function OrganizationsPage() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/unauthorized");

  const res = await apiServer("/auth/organizations", session.token);
  const body = res.ok ? await res.json().catch(() => null) : null;
  const orgs: OrgRow[] = Array.isArray(body) ? body : (body?.organizations ?? []);

  return (
    <AppShell
      title="Organizations"
      subtitle="Manage tenant organizations — set mode, feature access, and usage quotas."
    >
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <h2 className="font-semibold text-lg mb-4 text-zinc-900 dark:text-zinc-100">
            All Organizations
          </h2>
          <OrgDirectoryTable orgs={orgs} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <h2 className="font-semibold text-lg mb-1 text-zinc-900 dark:text-zinc-100">
            New Organization
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
            Creates the org and its first admin account in one step.
          </p>
          <CreateOrgPanel />
        </div>
      </div>
    </AppShell>
  );
}
