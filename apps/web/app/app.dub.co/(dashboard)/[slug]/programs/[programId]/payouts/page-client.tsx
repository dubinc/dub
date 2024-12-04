"use client";

import { MaxWidthWrapper } from "@dub/ui";
import { PayoutStats } from "./payout-stats";
import { PayoutTable } from "./payout-table";

export function ProgramPayoutsPageClient() {
  return (
    <MaxWidthWrapper>
      <PayoutStats />
      <div className="mt-6">
        <PayoutTable />
      </div>
    </MaxWidthWrapper>
  );
}
