import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContentOld } from "@/ui/layout/page-content";
import { Suspense } from "react";
import AnalyticsClient from "./client";

export default function WorkspaceAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContentOld title="Analytics">
        <AnalyticsClient>
          <Analytics />
        </AnalyticsClient>
      </PageContentOld>
    </Suspense>
  );
}
