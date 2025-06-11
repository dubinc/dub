import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import ProgramOverviewPageClient from "./page-client";

export default async function ProgramOverviewPage() {
  return (
    <PageContent title="Overview">
      <PageWidthWrapper>
        <ProgramOverviewPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
