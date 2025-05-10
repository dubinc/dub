import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ProgramResourcesPageClient } from "./page-client";

export default function ProgramResources() {
  return (
    <PageContent
      title="Resources"
      description="Shared brand logos, colors, and additional documents for your partners"
    >
      <MaxWidthWrapper className="mb-10">
        <ProgramResourcesPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
