import { AppShell } from "@/app/components/AppShell";
import { MasterDataBackLink } from "@/components/admin/master-data/MasterDataUi";
import MasterDataCategoriesClient from "./MasterDataCategoriesClient";

export default function MasterDataCategoriesPage() {
  return (
    <AppShell title="QB Categories" subtitle="Question bank classification categories.">
      <div className="mb-5">
        <MasterDataBackLink />
      </div>
      <MasterDataCategoriesClient />
    </AppShell>
  );
}
