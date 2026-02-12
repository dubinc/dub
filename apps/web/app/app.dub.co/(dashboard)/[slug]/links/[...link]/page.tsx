import { PageContentOld } from "@/ui/layout/page-content";
import { LinkPageClient } from "./page-client";

export default function LinkPage() {
  return (
    <PageContentOld
      className="h-full min-h-full md:mt-0 md:flex md:flex-col md:bg-transparent md:py-0"
      contentWrapperClassName="h-full grow pt-0 md:rounded-tl-2xl"
    >
      <LinkPageClient />
    </PageContentOld>
  );
}
