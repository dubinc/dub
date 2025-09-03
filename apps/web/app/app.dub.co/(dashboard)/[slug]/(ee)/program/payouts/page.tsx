import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramPayoutsPageClient } from "./page-client";
import { ProgramPayoutSettingsButton } from "./program-payout-settings-button";

export default function ProgramPayoutsPage() {
  return (
    <PageContent
      title="Payouts"
      titleInfo={{
        title:
          "Learn more about how you can send payouts to your affiliate partners globally with Dub.",
        href: "https://dub.co/help/article/partner-payouts",
      }}
      controls={<ProgramPayoutSettingsButton />}
    >
      <PageWidthWrapper>
        <ProgramPayoutsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
