import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { Suspense } from "react";
import AnalyticsClient from "./client";

export default function WorkspaceAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Analytics">
        <AnalyticsClient>
          <Analytics />
        </AnalyticsClient>
      </PageContent>
    </Suspense>
  );
}
