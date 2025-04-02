"use client";

import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { SaleStats } from "./sale-stats";
import { SaleTableBusiness } from "./sale-table";
import { SaleToggle } from "./sale-toggle";

export default function ProgramSales() {
  return (
    <PageContent title="Sales" titleControls={<SaleToggle />}>
      <MaxWidthWrapper>
        <SaleStats />
        <div className="mt-6">
          <SaleTableBusiness />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
