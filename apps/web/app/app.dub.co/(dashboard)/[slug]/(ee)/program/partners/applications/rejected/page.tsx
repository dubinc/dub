import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramPartnersRejectedApplicationsPageClient } from "./page-client";

export default function ProgramPartnersRejectedApplications({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <PageContent
      title="Rejected applications"
      titleBackHref={`/${params.slug}/program/partners/applications`}
    >
      <PageWidthWrapper>
        <ProgramPartnersRejectedApplicationsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
