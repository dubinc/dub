import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ApplicationsMenu } from "./applications-menu";
import { ProgramPartnersApplicationsPageClient } from "./page-client";

export default function ProgramPartnersApplications() {
  return (
    <PageContent
      title="Applications"
      titleInfo={{
        title:
          "Learn how to manage your pending applications, and to bring the best partners to your program.",
        href: "https://dub.co/help/article/program-applications",
      }}
      controls={<ApplicationsMenu />}
    >
      <PageWidthWrapper>
        <ProgramPartnersApplicationsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
