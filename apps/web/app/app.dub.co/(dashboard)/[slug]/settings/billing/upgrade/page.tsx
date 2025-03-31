import { MaxWidthWrapper } from "@dub/ui";
import { WorkspaceBillingUpgradePageClient } from "./page-client";

export default function WorkspaceBillingUpgrade() {
  return (
    <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
      <WorkspaceBillingUpgradePageClient />
    </MaxWidthWrapper>
  );
}
