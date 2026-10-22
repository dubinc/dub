import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { LoadingSpinner } from "@dub/ui";
import { Suspense } from "react";
import { PartnersNavTabs } from "./partners-nav-tabs";

export default function AdminPartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageWidthWrapper className="pb-12 pt-4">
      <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
        <PartnersNavTabs />
        <div className="border-border-subtle -mx-px -mb-px space-y-4 rounded-xl border bg-white p-4">
          <Suspense fallback={<PartnersPageFallback />}>{children}</Suspense>
        </div>
      </div>
    </PageWidthWrapper>
  );
}

function PartnersPageFallback() {
  return (
    <div className="flex h-96 items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
