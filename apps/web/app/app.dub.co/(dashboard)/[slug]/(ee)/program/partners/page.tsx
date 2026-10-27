import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { InvitePartnerButton } from "./invite-partner-button";
import { PartnersMenuPopover } from "./partners-menu-popover";
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
          <PartnersMenuPopover />
        </>
      }
    >
      <PageWidthWrapper>
        <PartnersTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
