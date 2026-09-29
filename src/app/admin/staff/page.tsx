import { AppShell } from "@/app/components/AppShell";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { apiServer } from "@/lib/apiClient";
import { StaffClient } from "./StaffClient";
import { type StaffRow } from "./StaffDirectoryTable";

export default async function StaffPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) redirect("/unauthorized");

  const sp = await searchParams;
  const error = sp?.error as string | undefined;

  const res = await apiServer("/auth/staff", session.token);
  const staff = res.ok ? await res.json().catch(() => []) : [];

  return (
    <AppShell title="Manage Staff" subtitle="Add, edit, or remove staff accounts with appropriate roles and branches.">
      <StaffClient staff={staff as StaffRow[]} serverError={error} />
    </AppShell>
  );
}
