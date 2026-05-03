"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CommmissionsMenuPopover } from "./commission-menu-popover";
import { CommissionsStats } from "./commissions-stats";
import { CommissionsTable } from "./commissions-table";
import { CreateCommissionButton } from "./create-commission-button";

export default function ProgramCommissions() {
  return (
    <PageContent
      title="Commissions"
      titleInfo={{
        title:
          "Learn how partner commissions work on Dub, and how to create manual commissions or clawbacks.",
        href: "https://dub.co/help/article/partner-commissions-clawbacks",
      }}
      controls={
        <>
          <CreateCommissionButton />
          <CommmissionsMenuPopover />
        </>
      }
    >
      <PageWidthWrapper>
        <CommissionsStats />
        <div className="mt-4">
          <CommissionsTable />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
