import { PageContent } from "@/ui/layout/page-content";

import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramLinksPageClient } from "./page-client";

export default function ProgramLinks() {
  return (
    <PageContent title="Links">
      <PageWidthWrapper className="pb-10">
        <ProgramLinksPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
