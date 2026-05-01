import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role;
  const target =
    role === "SUPER_ADMIN" || role === "ADMIN" || role === "RECRUITER"
      ? "/admin"
      : "/candidate/dashboard";
  redirect(target);
}
