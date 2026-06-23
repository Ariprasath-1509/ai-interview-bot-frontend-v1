import { redirect } from "next/navigation";

export default function TokenSettingsPage() {
  redirect("/admin/settings?tab=tokens");
}
