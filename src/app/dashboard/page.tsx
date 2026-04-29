import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role;
  const target =
    role === "BENCH_MANAGER" || role === "INTERVIEWER" || role === "HR"
      ? "/admin"
      : role === "COMPLIANCE"
        ? "/compliance"
        : "/candidate/dashboard";
  redirect(target);
}
