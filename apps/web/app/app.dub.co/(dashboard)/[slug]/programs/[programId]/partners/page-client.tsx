"use client";

import { MaxWidthWrapper } from "@dub/ui";
import { PartnerStats } from "./partner-stats";
import { PartnerTable } from "./partner-table";

export function ProgramPartnersPageClient() {
  return (
    <MaxWidthWrapper>
      <PartnerStats />
      <div className="mt-6">
        <PartnerTable />
      </div>
    </MaxWidthWrapper>
  );
}
