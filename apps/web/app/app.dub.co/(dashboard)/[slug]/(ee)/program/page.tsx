import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import ProgramOverviewPageClient from "./page-client";

export default async function ProgramOverviewPage() {
  return (
    <PageContent
      title="Overview"
      titleInfo={{
        title:
          "Learn how you can use Dub Partners to create, manage, and scale your affiliate program.",
        href: "https://dub.co/help/article/dub-partners",
      }}
    >
      <PageWidthWrapper className="mb-10">
        <ProgramOverviewPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
