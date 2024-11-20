import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ProgramResourcesPageClient } from "./page-client";

export default function ProgramResources() {
  return (
    <PageContent title="Resources">
      <MaxWidthWrapper>
        <ProgramResourcesPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
