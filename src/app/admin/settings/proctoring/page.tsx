import { redirect } from "next/navigation";

export default function ProctoringSettingsPage() {
  redirect("/admin/settings?tab=proctoring");
}
