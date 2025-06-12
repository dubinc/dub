import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CreatePayoutButton } from "./create-payout-button";
import { ProgramPayoutsPageClient } from "./page-client";

export default function ProgramPayoutsPage() {
  return (
    <PageContent title="Payouts" controls={<CreatePayoutButton />}>
      <PageWidthWrapper>
        <ProgramPayoutsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
