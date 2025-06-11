import { PageContentOld } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CustomersPageClient } from "./page-client";

export default function CustomersPage() {
  return (
    <PageContentOld title="Customers">
      <MaxWidthWrapper>
        <CustomersPageClient />
      </MaxWidthWrapper>
    </PageContentOld>
  );
}
