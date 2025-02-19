import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { EarningsCompositeChart } from "./earnings-composite-chart";
import { EarningsTablePartner } from "./earnings-table";

export default function ProgramEarning() {
  return (
    <PageContent title="Earnings" hideReferButton>
      <MaxWidthWrapper className="flex flex-col gap-6">
        <EarningsCompositeChart />
        <EarningsTablePartner />
      </MaxWidthWrapper>
    </PageContent>
  );
}
