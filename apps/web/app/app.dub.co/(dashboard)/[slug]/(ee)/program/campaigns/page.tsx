import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CampaignsTable } from "./campaigns-table";
import { CreateCampaignButton } from "./create-campaign-button";

export default function ProgramCampaignsPage() {
  return (
    <PageContent title="Email campaigns" controls={<CreateCampaignButton />}>
      <PageWidthWrapper>
        {/* <CampaignStats /> */}
        <div>
          <CampaignsTable />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
