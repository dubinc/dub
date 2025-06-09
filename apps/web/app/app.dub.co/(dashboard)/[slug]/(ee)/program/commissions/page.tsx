"use client";

import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CommissionStats } from "./commission-stats";
import { CommissionTable } from "./commission-table";
import { CreateCommissionButton } from "./create-commission-button";

export default function ProgramCommissions() {
  return (
    <PageContent title="Commissions" titleControls={<CreateCommissionButton />}>
      <MaxWidthWrapper>
        <CommissionStats />
        <div className="mt-6">
          <CommissionTable />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
