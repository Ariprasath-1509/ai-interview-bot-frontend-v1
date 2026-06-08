import { AppShell } from "@/app/components/AppShell";
import { MasterDataBackLink } from "@/components/admin/master-data/MasterDataUi";
import MasterDataCompaniesClient from "./MasterDataCompaniesClient";

export default function MasterDataCompaniesPage() {
  return (
    <AppShell title="QB Companies" subtitle="Company directory for interview sessions.">
      <div className="mb-5">
        <MasterDataBackLink />
      </div>
      <MasterDataCompaniesClient />
    </AppShell>
  );
}
