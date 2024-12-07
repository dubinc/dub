import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { SaleTablePartner } from "./sale-table";

export default function ProgramSales() {
  return (
    <PageContent title="Sales" hideReferButton>
      <MaxWidthWrapper>
        <SaleTablePartner />
      </MaxWidthWrapper>
    </PageContent>
  );
}
