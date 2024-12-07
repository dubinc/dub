import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutTable } from "./payout-table";
import { PayoutsSettingsLink } from "./payouts-settings-link";

export default function ProgramPayoutsPage() {
  return (
    <PageContent title="Payouts" titleControls={<PayoutsSettingsLink />}>
      <MaxWidthWrapper>
        <PayoutTable />
      </MaxWidthWrapper>
    </PageContent>
  );
}
