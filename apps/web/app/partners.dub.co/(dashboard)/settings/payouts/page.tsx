import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutStatsAndSettings } from "./payout-stats-and-settings";
import { PayoutTable } from "./payout-table";

export default function PartnersPayoutsSettings() {
  return (
    <PageContent title="Payouts" hideReferButton>
      <MaxWidthWrapper className="grid gap-4">
        <PayoutStatsAndSettings />
        <PayoutTable />
      </MaxWidthWrapper>
    </PageContent>
  );
}
