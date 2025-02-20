"use client";

import { PayoutStats } from "./payout-stats";
import { PayoutTable } from "./payout-table";

export function ProgramPayoutsPageClient() {
  return (
    <>
      <PayoutStats />
      <div className="my-6">
        <PayoutTable />
      </div>
    </>
  );
}
