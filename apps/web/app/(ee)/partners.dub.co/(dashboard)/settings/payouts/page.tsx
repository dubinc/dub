import { PageContentOld } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { InvoiceSettingsButton } from "./invoice-settings-button";
import { PayoutStatsAndSettings } from "./payout-stats-and-settings";
import { PayoutTable } from "./payout-table";

export default function PartnersPayoutsSettings() {
  return (
    <PageContentOld
      title="Payouts"
      showControls
      titleControls={<InvoiceSettingsButton />}
    >
      <MaxWidthWrapper className="grid grid-cols-1 gap-4">
        <PayoutStatsAndSettings />
        <PayoutTable />
      </MaxWidthWrapper>
    </PageContentOld>
  );
}
