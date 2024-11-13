"use client";

import { PageContent } from "@/ui/layout/page-content";
import { Button, buttonVariants, MaxWidthWrapper, Plus } from "@dub/ui";
import { cn } from "@dub/utils";
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
            onClick={() => setShowInvitePartnerSheet(true)}
            text="Invite Partner"
            icon={<Plus className="size-4" />}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm",
            )}
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
