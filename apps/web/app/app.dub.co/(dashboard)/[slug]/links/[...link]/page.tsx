import { PageContent } from "@/ui/layout/page-content";
import { LinkPageClient } from "./page-client";

export default function LinkPage() {
  return (
    <PageContent
      className="md:mt-0 md:bg-transparent md:py-0"
      contentWrapperClassName="pt-0 md:rounded-tl-2xl"
    >
      <LinkPageClient />
    </PageContent>
  );
}
