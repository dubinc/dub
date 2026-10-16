import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { EarningsCompositeChart } from "@/ui/partners/earnings/earnings-composite-chart";
import { EarningsTablePartner } from "@/ui/partners/earnings/earnings-table";

export default function PartnerEarningsPage() {
  return (
    <PageContent title="Earnings">
      <PageWidthWrapper className="flex flex-col gap-5 pb-10">
        <EarningsCompositeChart />
        <EarningsTablePartner />
      </PageWidthWrapper>
    </PageContent>
  );
}
