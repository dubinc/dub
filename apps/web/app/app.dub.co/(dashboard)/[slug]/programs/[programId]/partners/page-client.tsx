"use client";

import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { InvitePartnerButton } from "./invite-partner-button";
import { PartnerStats } from "./partner-stats";
import { PartnerTable } from "./partner-table";

export function ProgramPartnersPageClient() {
  return (
    <>
      <PageContent title="Partners" titleControls={<InvitePartnerButton />}>
        <MaxWidthWrapper>
          <PartnerStats />
          <div className="mt-6">
            <PartnerTable />
          </div>
        </MaxWidthWrapper>
      </PageContent>
    </>
  );
}
