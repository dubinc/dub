import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { FraudEventGroupsTable } from "./fraud-event-groups-table";
import { ProgramFraudActionsMenu } from "./program-fraud-actions-menu";
import { ProgramFraudSettingsButton } from "./program-fraud-settings-button";

export default function ProgramFraudRiskPage() {
  return (
    <PageContent
      title="Fraud Detection"
      controls={
        <>
          <ProgramFraudSettingsButton />
          <ProgramFraudActionsMenu />
        </>
      }
    >
      <PageWidthWrapper>
        <FraudEventGroupsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
