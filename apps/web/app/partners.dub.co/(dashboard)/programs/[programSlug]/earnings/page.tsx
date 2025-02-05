import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { EarningsTablePartner } from "./earnings-table";

export default function ProgramSales() {
  return (
    <PageContent title="Sales" hideReferButton>
      <MaxWidthWrapper>
        <EarningsTablePartner />
      </MaxWidthWrapper>
    </PageContent>
  );
}
