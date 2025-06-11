import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CustomersPageClient } from "./page-client";

export default function CustomersPage() {
  return (
    <PageContent title="Customers">
      <PageWidthWrapper>
        <CustomersPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
