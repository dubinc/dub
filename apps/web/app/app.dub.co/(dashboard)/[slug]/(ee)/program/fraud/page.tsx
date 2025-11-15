import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { FraudEventsTable } from "./fraud-events-table";
import { ProgramFraudSettingsButton } from "./program-fraud-settings-button";

export default function ProgramFraudRiskPage() {
  return (
    <PageContent title="Fraud & Risk" controls={<ProgramFraudSettingsButton />}>
      <PageWidthWrapper>
        <FraudEventsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
