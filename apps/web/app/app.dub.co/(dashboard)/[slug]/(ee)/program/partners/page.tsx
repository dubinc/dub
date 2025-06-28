import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ImportExportButtons } from "./import-export-buttons";
import { InvitePartnerButton } from "./invite-partner-button";
import { ProgramPartnersPageClient } from "./page-client";

export default function ProgramPartners() {
  return (
    <PageContent
      title="Partners"
      titleInfo={{
        title:
          "Invite influencers, affiliates, and users to your program, or enroll them automatically.",
        href: "https://dub.co/help/article/inviting-partners",
      }}
      controls={
        <>
          <InvitePartnerButton />
          <ImportExportButtons />
        </>
      }
    >
      <PageWidthWrapper>
        <ProgramPartnersPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
