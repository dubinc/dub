import { PageContentOld } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CustomerPageClient } from "./page-client";

export default function CustomerPage() {
  return (
    <PageContentOld>
      <MaxWidthWrapper>
        <CustomerPageClient />
      </MaxWidthWrapper>
    </PageContentOld>
  );
}
