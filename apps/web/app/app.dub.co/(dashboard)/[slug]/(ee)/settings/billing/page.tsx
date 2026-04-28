import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import PaymentMethods from "./payment-methods";
import PlanUsage from "./plan-usage";

export default function WorkspaceBilling() {
  return (
    <PageContent title="Billing">
      <PageWidthWrapper className="grid gap-8">
        <PlanUsage />
        <PaymentMethods />
      </PageWidthWrapper>
    </PageContent>
  );
}
