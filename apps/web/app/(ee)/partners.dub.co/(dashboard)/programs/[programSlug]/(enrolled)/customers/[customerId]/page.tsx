import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ProgramCustomerPageClient } from "./page-client";

export default function ProgramCustomer() {
  return (
    <PageContent showControls>
      <MaxWidthWrapper className="flex flex-col gap-6">
        <ProgramCustomerPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
