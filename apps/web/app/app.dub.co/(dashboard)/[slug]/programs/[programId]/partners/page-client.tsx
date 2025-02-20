"use client";

import { PartnerStats } from "./partner-stats";
import { PartnerTable } from "./partner-table";

export function ProgramPartnersPageClient() {
  return (
    <>
      <PartnerStats />
      <div className="mt-6">
        <PartnerTable />
      </div>
    </>
  );
}
