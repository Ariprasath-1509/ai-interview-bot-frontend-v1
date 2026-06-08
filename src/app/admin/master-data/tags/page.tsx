import { AppShell } from "@/app/components/AppShell";
import { MasterDataBackLink } from "@/components/admin/master-data/MasterDataUi";
import MasterDataTagsClient from "./MasterDataTagsClient";

export default function MasterDataTagsPage() {
  return (
    <AppShell title="QB Tags" subtitle="Question bank tags for search and digest.">
      <div className="mb-5">
        <MasterDataBackLink />
      </div>
      <MasterDataTagsClient />
    </AppShell>
  );
}
