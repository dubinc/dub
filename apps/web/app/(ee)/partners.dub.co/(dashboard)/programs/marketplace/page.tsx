import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramMarketplacePageClient } from "./page-client";

export default function PartnersDashboard() {
  return (
    <PageContent title="Program Marketplace">
      <PageWidthWrapper>
        <ProgramMarketplacePageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
