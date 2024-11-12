import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import ProgramOverviewPageClient from "./page-client";

export default async function ProgramOverviewPage() {
  return (
    <PageContent title="Overview">
      <MaxWidthWrapper>
        <ProgramOverviewPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
