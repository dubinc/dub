import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { WalletSettingsPageClient } from "./page-client";

export default function WalletSettings() {
  return (
    <PageContent title="Wallet" hideReferButton>
      <MaxWidthWrapper>
        <WalletSettingsPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
