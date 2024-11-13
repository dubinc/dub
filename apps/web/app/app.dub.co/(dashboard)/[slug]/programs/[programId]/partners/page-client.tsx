"use client";

import { PageContent } from "@/ui/layout/page-content";
import { Button, MaxWidthWrapper, Plus } from "@dub/ui";
import { useInvitePartnerSheet } from "./invite-partner-sheet";
import { PartnerStats } from "./partner-stats";
import { PartnerTable } from "./partner-table";

export function ProgramPartnersPageClient() {
  const { invitePartnerSheet, setIsOpen: setShowInvitePartnerSheet } =
    useInvitePartnerSheet();

  return (
    <>
      {invitePartnerSheet}
      <PageContent
        title="Partners"
        titleControls={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowInvitePartnerSheet(true)}
            text="Invite Partner"
            icon={<Plus className="size-4" />}
          />
        }
      >
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
