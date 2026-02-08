import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramMarketplacePageClient } from "./page-client";

export default function PartnersDashboard() {
  return (
    <PageContent
      title="Program Marketplace"
      titleInfo={{
        title:
          "Explore the Dub program marketplace to discover new programs, learn what rewards they offer, and apply to the ones that fit your content and audience.",
        href: "https://dub.co/help/article/program-marketplace",
      }}
    >
      <PageWidthWrapper>
        <ProgramMarketplacePageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
