import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { InvoiceSettingsButton } from "./invoice-settings-button";
import { PayoutStatsAndSettings } from "./payout-stats-and-settings";
import { PayoutTable } from "./payout-table";

export default function PartnersPayoutsSettings() {
  return (
    <PageContent title="Payouts" controls={<InvoiceSettingsButton />}>
      <PageWidthWrapper className="grid grid-cols-1 gap-4 pb-10">
        <PayoutStatsAndSettings />
        <PayoutTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
