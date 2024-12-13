import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutTable } from "./payout-table";

export default function ProgramPayoutsPage() {
  return (
    <PageContent title="Payouts" hideReferButton>
      <MaxWidthWrapper>
        <PayoutTable />
      </MaxWidthWrapper>
    </PageContent>
  );
}
