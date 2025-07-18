import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramCustomerPageClient } from "./page-client";

export default function ProgramCustomer() {
  return (
    <PageContent>
      <PageWidthWrapper className="flex flex-col gap-6 pb-10">
        <ProgramCustomerPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
