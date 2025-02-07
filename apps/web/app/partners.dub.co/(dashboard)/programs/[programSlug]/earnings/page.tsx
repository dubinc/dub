import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { EarningsTablePartner } from "./earnings-table";

export default function ProgramEarning() {
  return (
    <PageContent title="Earnings" hideReferButton>
      <MaxWidthWrapper>
        <EarningsTablePartner />
      </MaxWidthWrapper>
    </PageContent>
  );
}
