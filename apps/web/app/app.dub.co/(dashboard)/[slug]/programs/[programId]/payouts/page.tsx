import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CreatePayoutButton } from "./create-payout-button";
import { ProgramPayoutsPageClient } from "./page-client";
import { PayoutsSettingsLink } from "./payout-settings-link";
export default function ProgramPayoutsPage() {
  return (
    <PageContent
      title="Payouts"
      titleControls={
        <>
          <CreatePayoutButton />
          <PayoutsSettingsLink />
        </>
      }
    >
      <MaxWidthWrapper>
        <ProgramPayoutsPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
