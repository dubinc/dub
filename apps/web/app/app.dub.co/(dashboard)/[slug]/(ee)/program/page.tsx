import { PageContentOld } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import ProgramOverviewPageClient from "./page-client";

export default async function ProgramOverviewPage() {
  return (
    <PageContentOld title="Overview">
      <MaxWidthWrapper>
        <ProgramOverviewPageClient />
      </MaxWidthWrapper>
    </PageContentOld>
  );
}
