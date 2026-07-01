import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isStaffReadRole } from "@/lib/staffRoles";
import { BulkCreateClient } from "./BulkCreateClient";

export const dynamic = "force-dynamic";

export default async function BulkCreatePage() {
  const session = await getSession();
  if (!session || !isStaffReadRole(session.role)) redirect("/login");
  return <BulkCreateClient />;
}
