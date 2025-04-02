import { PageContent } from "@/ui/layout/page-content";

import { MaxWidthWrapper } from "@dub/ui";
import { ProgramLinksPageClient } from "./page-client";

export default function ProgramLinks() {
  return (
    <PageContent title="Links" hideReferButton>
      <MaxWidthWrapper className="pb-10">
        <ProgramLinksPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
