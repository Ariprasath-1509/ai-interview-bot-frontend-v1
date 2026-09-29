import { AppShell } from "@/app/components/AppShell";
import { getSession } from "@/lib/session";
import { getEnabledFeatures } from "@/lib/orgFeatures";
import MasterDataOverviewClient from "./MasterDataOverviewClient";

export default async function MasterDataPage() {
  const session = await getSession();
  const features = await getEnabledFeatures(session);

  return (
    <AppShell title="Master Data">
      <MasterDataOverviewClient questionBankEnabled={features.QUESTION_BANK !== false} />
    </AppShell>

  );
}
