import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { CustomerPageClient } from "./page-client";

export default function CustomerPage() {
  return (
    <PageContent>
      <MaxWidthWrapper>
        <CustomerPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
