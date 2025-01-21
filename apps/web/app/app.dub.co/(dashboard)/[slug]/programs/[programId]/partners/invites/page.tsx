import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { AddPartnerButton } from "../add-partner-button";
import { ProgramPartnersInvitesPageClient } from "./page-client";

export default function ProgramPartners({
  params: { slug, programId },
}: {
  params: { slug: string; programId: string };
}) {
  return (
    <PageContent
      title="Invited partners"
      titleBackButtonLink={`/${slug}/programs/${programId}/partners`}
      titleControls={<AddPartnerButton />}
    >
      <MaxWidthWrapper>
        <ProgramPartnersInvitesPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
