import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramPartnersRejectedApplicationsPageClient } from "./page-client";

export default async function ProgramPartnersRejectedApplications(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
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
