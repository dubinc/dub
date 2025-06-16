import { PageContentOld } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutStatsAndSettings } from "./payout-stats-and-settings";
import { PayoutTable } from "./payout-table";
import { UpdateInvoiceInfoButton } from "./update-invoice-info-button";

export default function PartnersPayoutsSettings() {
  return (
    <PageContentOld
      title="Payouts"
      showControls
      titleControls={<UpdateInvoiceInfoButton />}
    >
      <MaxWidthWrapper className="grid grid-cols-1 gap-4">
        <PayoutStatsAndSettings />
        <PayoutTable />
      </MaxWidthWrapper>
    </PageContentOld>
  );
}
