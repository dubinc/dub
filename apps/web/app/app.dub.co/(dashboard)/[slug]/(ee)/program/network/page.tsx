import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { InvitesUsage } from "@/ui/partners/partner-network/invites-usage";
import { NetworkMenu } from "./network-menu";
import { ProgramPartnerNetworkPageClient } from "./page-client";

export default function ProgramPartnerNetwork() {
  return (
    <PageContent
      title="Partner Network"
      controls={
        <div className="flex items-center gap-2">
          <InvitesUsage />
          <NetworkMenu />
        </div>
      }
    >
      <PageWidthWrapper className="mb-10">
        <ProgramPartnerNetworkPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
