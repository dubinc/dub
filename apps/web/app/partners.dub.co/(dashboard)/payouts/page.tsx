import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutSettings } from "./payout-settings";
import { PayoutTable } from "./payout-table";

export default function ProgramPayoutsPage() {
  return (
    <PageContent title="Payouts" hideReferButton>
      <MaxWidthWrapper className="grid gap-4">
        <PayoutSettings />
        <PayoutTable />
      </MaxWidthWrapper>
    </PageContent>
  );
}
