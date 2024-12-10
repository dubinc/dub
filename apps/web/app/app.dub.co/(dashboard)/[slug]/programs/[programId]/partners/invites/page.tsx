import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { use } from "react";
import { InvitePartnerButton } from "../invite-partner-button";
import { ProgramPartnersInvitesPageClient } from "./page-client";

export default function ProgramPartners({
  params,
}: {
  params: Promise<{ slug: string; programId: string }>;
}) {
  const { slug, programId } = use(params);

  return (
    <PageContent
      title="Invited partners"
      titleBackButtonLink={`/${slug}/programs/${programId}/partners`}
      titleControls={<InvitePartnerButton />}
    >
      <MaxWidthWrapper>
        <ProgramPartnersInvitesPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
