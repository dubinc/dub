"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BountyList } from "./bounty-list";
import { CreateBountyButton } from "./create-bounty-button";

export default function ProgramCommissions() {
  return (
    <PageContent
      title="Bounties"
      titleInfo={{
        title:
          "Learn how partner commissions work on Dub, and how to create manual commissions or clawbacks.",
        href: "https://dub.co/help/article/partner-commissions-clawbacks",
      }}
      controls={<CreateBountyButton />}
    >
      <PageWidthWrapper>
        <BountyList />
      </PageWidthWrapper>
    </PageContent>
  );
}
