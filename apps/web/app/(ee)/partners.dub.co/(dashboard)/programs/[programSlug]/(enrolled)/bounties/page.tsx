"use client";

import { usePartnerProfileBounties } from "@/lib/swr/use-partner-profile-bounties";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerBountiesView } from "@/ui/partners/bounties/partner-bounties-view";
import { useParams } from "next/navigation";

export default function PartnerProgramBountiesPage() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { bounties, bountiesCount, isLoading } = usePartnerProfileBounties({
    programIdOrSlug: programSlug,
  });

  return (
    <PageContent title="Bounties">
      <PageWidthWrapper className="pb-10">
        <PartnerBountiesView
          bounties={bounties}
          bountiesCount={bountiesCount}
          isLoading={isLoading}
          getHref={(bounty) => `/programs/${programSlug}/bounties/${bounty.id}`}
        />
      </PageWidthWrapper>
    </PageContent>
  );
}
