import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CreatePayoutButton } from "./create-payout-button";
import { ProgramPayoutsPageClient } from "./page-client";

export default function ProgramPayoutsPage() {
  return (
    <PageContent
      title="Payouts"
      titleControls={
        <div className="flex items-center gap-2">
          <CreatePayoutButton />
        </div>
      }
    >
      <MaxWidthWrapper>
        <ProgramPayoutsPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
