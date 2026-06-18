import { isStaffReadRole } from '@/lib/staffRoles';
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role;
  const target =
    isStaffReadRole(role)
      ? "/admin"
      : "/candidate/dashboard";
  redirect(target);
}
