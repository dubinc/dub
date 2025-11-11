import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { FraudEventsTable } from "./fraud-events-table";

export default function ProgramFraudRiskPage() {
  return (
    <PageContent title="Fraud & Risk">
      <PageWidthWrapper>
        <FraudEventsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
