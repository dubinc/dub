import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ApplicationsMenuPopover } from "./applications-menu-popover";
import { ProgramPartnersApplicationsPageClient } from "./page-client";

export default function ProgramPartnersApplications() {
  return (
    <PageContent
      title="Applications"
      titleInfo={{
        title:
          "Learn how to review and [manage your program applications](https://dub.co/help/article/program-applications) and bring the best partners to your program.",
      }}
      controls={<ApplicationsMenuPopover />}
    >
      <PageWidthWrapper>
        <ProgramPartnersApplicationsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
