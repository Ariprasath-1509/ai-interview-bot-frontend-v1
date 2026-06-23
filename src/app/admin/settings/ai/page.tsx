import { redirect } from "next/navigation";

export default function AiSettingsPage() {
  redirect("/admin/settings?tab=ai");
}
