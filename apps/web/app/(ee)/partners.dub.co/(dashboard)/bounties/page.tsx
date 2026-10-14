"use client";

import { usePartnerProfileBounties } from "@/lib/swr/use-partner-profile-bounties";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerBountiesView } from "@/ui/partners/bounties/partner-bounties-view";

export default function PartnerBountiesPage() {
  const { bounties, bountiesCount, isLoading } = usePartnerProfileBounties();

  return (
    <PageContent title="Bounties">
      <PageWidthWrapper className="pb-10">
        <PartnerBountiesView
          bounties={bounties}
          bountiesCount={bountiesCount}
          isLoading={isLoading}
          getHref={(bounty) =>
            `/programs/${bounty.program.slug}/bounties/${bounty.id}`
          }
          showProgram
        />
      </PageWidthWrapper>
    </PageContent>
  );
}
