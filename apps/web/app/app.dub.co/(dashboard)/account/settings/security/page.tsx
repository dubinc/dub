import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import SecurityPageClient from "./page-client";

export default async function SecurityPage() {
  return (
    <PageContent title="Security">
      <PageWidthWrapper>
        <SecurityPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
