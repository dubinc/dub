import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CustomersPageClient } from "./page-client";

export default function CustomersPage() {
  return (
    <PageContent title="Customers">
      <MaxWidthWrapper>
        <CustomersPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
