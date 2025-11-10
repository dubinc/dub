import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CampaignStats } from "./campaign-stats";
import { CampaignsPageContent } from "./campaigns-page-content";
import { CampaignsTable } from "./campaigns-table";
import { CreateCampaignButton } from "./create-campaign-button";

export default function ProgramCampaignsPage() {
  return (
    <CampaignsPageContent controls={<CreateCampaignButton />}>
      <PageWidthWrapper>
        <div className="space-y-4">
          <CampaignStats />
          <CampaignsTable />
        </div>
      </PageWidthWrapper>
    </CampaignsPageContent>
  );
}
