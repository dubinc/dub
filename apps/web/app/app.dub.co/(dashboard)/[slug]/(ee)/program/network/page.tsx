import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramPartnerNetworkPageClient } from "./page-client";

export default function ProgramPartnerNetwork() {
  return (
    <PageContent title="Partner Network">
      <PageWidthWrapper className="mb-10">
        <ProgramPartnerNetworkPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
