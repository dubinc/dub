import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramPartnersDirectoryPageClient } from "./page-client";

export default function ProgramPartnersDirectory() {
  return (
    <PageContent title="Partner Discovery">
      <PageWidthWrapper className="mb-10">
        <ProgramPartnersDirectoryPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
