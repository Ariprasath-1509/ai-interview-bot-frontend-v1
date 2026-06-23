import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import MasterDataOverviewClient from "./MasterDataOverviewClient";

export default function MasterDataPage() {
  return (
    <AppShell
      title="Master Data"
      subtitle="Manage lookup values, categories, tags, and companies without code changes."
    >
      <MasterDataOverviewClient />
    </AppShell>
  );
}
