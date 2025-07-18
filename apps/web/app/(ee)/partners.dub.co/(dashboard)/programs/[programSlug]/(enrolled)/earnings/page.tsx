import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { EarningsCompositeChart } from "./earnings-composite-chart";
import { EarningsTablePartner } from "./earnings-table";

export default function ProgramEarning() {
  return (
    <PageContent title="Earnings">
      <PageWidthWrapper className="flex flex-col gap-6 pb-10">
        <EarningsCompositeChart />
        <EarningsTablePartner />
      </PageWidthWrapper>
    </PageContent>
  );
}
