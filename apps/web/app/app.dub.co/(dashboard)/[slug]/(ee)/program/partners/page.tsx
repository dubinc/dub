import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ImportExportButtons } from "./import-export-buttons";
import { InvitePartnerButton } from "./invite-partner-button";
import { PartnersTable } from "./partners-table";

export default function ProgramPartners() {
  return (
    <PageContent
      title="Partners"
      titleInfo={{
        title:
          "Understand how all your partners are performing and contributing to the success of your partner program.",
        href: "https://dub.co/help/article/managing-program-partners",
      }}
      controls={
        <>
          <InvitePartnerButton />
          <ImportExportButtons />
        </>
      }
    >
      <PageWidthWrapper>
        <PartnersTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
