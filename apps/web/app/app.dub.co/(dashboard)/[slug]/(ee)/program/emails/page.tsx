import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CreateEmailButton } from "./create-email-button";
import { ProgramEmailsPageClient } from "./page-client";

export default function ProgramEmailsPage() {
  return (
    <PageContent title="Email campaigns" controls={<CreateEmailButton />}>
      <PageWidthWrapper className="mb-8">
        <ProgramEmailsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
