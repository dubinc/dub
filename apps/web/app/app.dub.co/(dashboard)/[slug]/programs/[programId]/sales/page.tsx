import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { SaleStats } from "./sale-stats";
import { SaleTableBusiness } from "./sale-table";

export default function ProgramSales() {
  return (
    <PageContent title="Sales">
      <MaxWidthWrapper>
        <SaleStats />
        <div className="mt-6">
          <SaleTableBusiness />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
