import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { EarningsBreakdown } from "@/ui/partners/earnings/earnings-breakdown";
import { EarningsCompositeChart } from "@/ui/partners/earnings/earnings-composite-chart";
import { EarningsTablePartner } from "@/ui/partners/earnings/earnings-table";

export default function PartnerEarningsPage() {
  return (
    <PageContent title="Earnings">
      <PageWidthWrapper className="flex flex-col gap-5 pb-10">
        <EarningsCompositeChart />
        <EarningsTablePartner />
        <EarningsBreakdown />
      </PageWidthWrapper>
    </PageContent>
  );
}
