"use client";

import { MaxWidthWrapper } from "@dub/ui";
import { PayoutTable } from "./payout-table";

export default function ProgramPayoutsPageClient() {
  return (
    <MaxWidthWrapper>
      <PayoutTable />
    </MaxWidthWrapper>
  );
}
