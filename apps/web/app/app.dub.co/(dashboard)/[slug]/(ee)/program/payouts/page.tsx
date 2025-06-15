import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramPayoutsPageClient } from "./page-client";

export default function ProgramPayoutsPage() {
  return (
    <PageContent title="Payouts">
      <PageWidthWrapper>
        <ProgramPayoutsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
