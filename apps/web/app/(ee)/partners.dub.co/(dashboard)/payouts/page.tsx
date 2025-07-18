import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerPayoutSettingsButton } from "./partner-payout-settings-button";
import { PayoutStats } from "./payout-stats";
import { PayoutTable } from "./payout-table";

export default function PartnersPayoutsSettings() {
  return (
    <PageContent title="Payouts" controls={<PartnerPayoutSettingsButton />}>
      <PageWidthWrapper className="grid grid-cols-1 gap-4 pb-10">
        <PayoutStats />
        <PayoutTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
