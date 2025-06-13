import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramSettingsDiscountsPageClient } from "./page-client";

export default function ProgramSettingsDiscountsPage() {
  return (
    <PageContent title="Discounts">
      <PageWidthWrapper className="mb-8">
        <ProgramSettingsDiscountsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
