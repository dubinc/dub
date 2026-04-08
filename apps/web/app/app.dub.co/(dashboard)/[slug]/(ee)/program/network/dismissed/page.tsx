import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { InvitesUsage } from "@/ui/partners/partner-network/invites-usage";
import { NetworkMenu } from "../network-menu";
import { ProgramPartnerNetworkDismissedPageClient } from "./page-client";

export default async function ProgramPartnerNetworkNotAFit(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <PageContent
      title="Dismissed partners"
      titleBackHref={`/${params.slug}/program/network`}
      controls={
        <div className="flex items-center gap-2">
          <InvitesUsage />
          <NetworkMenu />
        </div>
      }
    >
      <PageWidthWrapper className="mb-10">
        <ProgramPartnerNetworkDismissedPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
