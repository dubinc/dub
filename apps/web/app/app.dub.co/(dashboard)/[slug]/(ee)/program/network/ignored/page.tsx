import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { InvitesUsage } from "@/ui/partners/partner-network/invites-usage";
import { ProgramPartnerNetworkPageClient } from "../page-client";

export default async function ProgramPartnerNetworkIgnored(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <PageContent
      title="Ignored partners"
      titleBackHref={`/${params.slug}/program/network`}
      controls={<InvitesUsage />}
    >
      <PageWidthWrapper className="mb-10">
        <ProgramPartnerNetworkPageClient variant="ignored" />
      </PageWidthWrapper>
    </PageContent>
  );
}
