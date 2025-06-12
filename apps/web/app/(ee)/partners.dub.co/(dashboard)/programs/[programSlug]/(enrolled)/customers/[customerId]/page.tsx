import { PageContentOld } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ProgramCustomerPageClient } from "./page-client";

export default function ProgramCustomer() {
  return (
    <PageContentOld showControls>
      <MaxWidthWrapper className="flex flex-col gap-6">
        <ProgramCustomerPageClient />
      </MaxWidthWrapper>
    </PageContentOld>
  );
}
