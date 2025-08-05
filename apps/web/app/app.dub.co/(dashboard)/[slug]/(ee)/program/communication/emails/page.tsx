import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramEmailsPageClient } from "./page-client";

export default function ProgramEmailsPage() {
  return (
    <PageContent title="Email campaigns">
      <PageWidthWrapper className="mb-8">
        <ProgramEmailsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
