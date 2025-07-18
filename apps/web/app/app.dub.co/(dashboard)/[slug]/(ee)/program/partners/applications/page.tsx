import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ApplicationsMenu } from "./applications-menu";
import { ProgramPartnersApplicationsPageClient } from "./page-client";

export default function ProgramPartnersApplications() {
  return (
    <PageContent title="Applications" controls={<ApplicationsMenu />}>
      <PageWidthWrapper>
        <ProgramPartnersApplicationsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
