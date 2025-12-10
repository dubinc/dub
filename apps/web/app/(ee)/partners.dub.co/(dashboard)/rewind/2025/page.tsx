import { PageContent } from "@/ui/layout/page-content";
import { PartnerRewind2025PageClient } from "./page-client";

export default async function PartnerRewind2025Page() {
  return (
    <PageContent
      title="Partner rewind"
      className="flex h-full flex-col"
      contentWrapperClassName="grow"
    >
      <div className="relative size-full">
        <div className="scrollbar-hide flex size-full items-center justify-center overflow-y-auto">
          <PartnerRewind2025PageClient />
        </div>
      </div>
    </PageContent>
  );
}
