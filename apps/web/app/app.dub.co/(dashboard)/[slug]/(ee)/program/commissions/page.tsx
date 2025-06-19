"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CommissionPopoverButtons } from "./commission-popover-buttons";
import { CommissionStats } from "./commission-stats";
import { CommissionTable } from "./commission-table";
import { CreateCommissionButton } from "./create-commission-button";

export default function ProgramCommissions() {
  return (
    <PageContent
      title="Commissions"
      controls={
        <>
          <CreateCommissionButton />
          <CommissionPopoverButtons />
        </>
      }
    >
      <PageWidthWrapper>
        <CommissionStats />
        <div className="mt-6">
          <CommissionTable />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
