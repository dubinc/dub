import { PageContent } from "@/ui/layout/page-content";
import { InvitePartnerButton } from "./invite-partner-button";
import { ProgramPartnersPageClient } from "./page-client";

export default function ProgramPartners() {
  return (
    <PageContent title="Partners" titleControls={<InvitePartnerButton />}>
      <ProgramPartnersPageClient />
    </PageContent>
  );
}
