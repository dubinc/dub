import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramPartnersApplicationsPageClient } from "./page-client";

export default function ProgramPartnersApplications() {
  return (
    <PageContent title="Applications">
      <PageWidthWrapper>
        <ProgramPartnersApplicationsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
