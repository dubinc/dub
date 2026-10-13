"use client";

import { usePartnerProgramBounties } from "@/lib/swr/use-partner-program-bounties";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerBountiesView } from "@/ui/partners/bounties/partner-bounties-view";
import { useParams } from "next/navigation";

export default function PartnerProgramBountiesPage() {
  const { programSlug } = useParams();
  const { bounties, bountiesCount, isLoading } = usePartnerProgramBounties();

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
