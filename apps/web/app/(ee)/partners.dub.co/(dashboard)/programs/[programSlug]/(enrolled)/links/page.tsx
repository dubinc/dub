import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerProgramLinksPageClient } from "./page-client";

export default function PartnerProgramLinksPage() {
  return (
    <PageContent title="Links">
      <PageWidthWrapper className="pb-10">
        <PartnerProgramLinksPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
