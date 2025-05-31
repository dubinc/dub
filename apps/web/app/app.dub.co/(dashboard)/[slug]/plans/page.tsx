import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import PlansContent from "@/ui/plans/plans-content";
import { MaxWidthWrapper } from "@dub/ui";
import { Suspense } from "react";

export default function WorkspaceAnalyticsEvents() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Plans and Payments">
        <MaxWidthWrapper>
          <PlansContent />
        </MaxWidthWrapper>
      </PageContent>
    </Suspense>
  );
}
