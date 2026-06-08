import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import { getSession } from "@/lib/session";
import { MasterDataBackLink } from "@/components/admin/master-data/MasterDataUi";
import MasterDataLookupsClient from "./MasterDataLookupsClient";

export default async function MasterDataLookupsPage() {
  const session = await getSession();
  const canEdit = session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";

  return (
    <AppShell title="Lookup Values" subtitle="Edit skill sets, statuses, sources, rounds, and other enums.">
      <div className="mb-5">
        <MasterDataBackLink />
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <MasterDataLookupsClient canEdit={canEdit} />
      </Suspense>
    </AppShell>
  );
}
