import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramSettingsDiscountsPageClient } from "./page-client";

export default function ProgramSettingsDiscountsPage() {
  return (
    <PageContent
      title="Discounts"
      titleInfo={{
        title:
          "Create dual-sided incentives (e.g. discounts for new customers and rewards for partners).",
        href: "https://dub.co/help/article/dual-sided-incentives",
      }}
    >
      <PageWidthWrapper className="mb-8">
        <ProgramSettingsDiscountsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
