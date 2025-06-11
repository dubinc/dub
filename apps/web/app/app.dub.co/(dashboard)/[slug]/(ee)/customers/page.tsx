import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { InfoTooltip, TooltipContent } from "@dub/ui";
import { CustomersPageClient } from "./page-client";

export default function CustomersPage() {
  return (
    <PageContent
      title="Customers"
      titleInfo={
        <InfoTooltip
          content={
            <TooltipContent
              title="Get deeper, real-time insights about your customers' demographics, purchasing behavior, and lifetime value (LTV)."
              href="https://dub.co/help/article/customer-insights"
              target="_blank"
              cta="Learn more"
            />
          }
        />
      }
    >
      <PageWidthWrapper>
        <CustomersPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
