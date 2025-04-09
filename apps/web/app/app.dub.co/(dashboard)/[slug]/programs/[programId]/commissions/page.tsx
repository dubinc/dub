"use client";

import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CommissionStats } from "./commission-stats";
import { CommissionTable } from "./commission-table";

export default function ProgramCommissions() {
  return (
    <PageContent title="Commissions">
      <MaxWidthWrapper>
        <CommissionStats />
        <div className="mt-6">
          <CommissionTable />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
