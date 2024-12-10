import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { InvitePartnerButton } from "../invite-partner-button";
import { ProgramPartnersInvitesPageClient } from "./page-client";

export default function ProgramPartners() {
  return (
    <PageContent
      title="Invited partners"
      titleControls={<InvitePartnerButton />}
    >
      <MaxWidthWrapper>
        <ProgramPartnersInvitesPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
