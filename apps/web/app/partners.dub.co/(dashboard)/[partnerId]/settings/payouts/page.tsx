import { PageContent } from "@/ui/layout/page-content";

import { MaxWidthWrapper } from "@dub/ui";
import { PayoutsSettingsPageClient } from "./page-client";

export default function PayoutsSettings() {
  return (
    <PageContent title="Payouts" description="Manage your payout methods">
      <MaxWidthWrapper>
        <PayoutsSettingsPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
