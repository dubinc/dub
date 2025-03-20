import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ImportExportButtons } from "./import-export-buttons";
import { InvitePartnerButton } from "./invite-partner-button";
import { ProgramPartnersPageClient } from "./page-client";

export default function ProgramPartners() {
  return (
    <PageContent
      title="Partners"
      titleControls={
        <div className="flex items-center gap-2">
          <InvitePartnerButton />
          <ImportExportButtons />
        </div>
      }
    >
      <MaxWidthWrapper>
        <ProgramPartnersPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
