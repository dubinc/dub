import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerPayoutSettingsButton } from "./partner-payout-settings-button";
import { PayoutStats } from "./payout-stats";
import { PayoutTable } from "./payout-table";

export default function PartnersPayoutsSettings() {
  return (
    <PageContent
      title="Payouts"
      titleInfo={{
        title:
          "Connect a bank account and start receiving partner payouts from the affiliate programs you're working with.",
        href: "https://dub.co/help/article/receiving-payouts",
      }}
      controls={<PartnerPayoutSettingsButton />}
    >
      <PageWidthWrapper className="grid grid-cols-1 gap-4 pb-10">
        <PayoutStats />
        <PayoutTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
