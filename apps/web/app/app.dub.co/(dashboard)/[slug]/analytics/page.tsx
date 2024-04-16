import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import AnalyticsClient from "./client";

export default function WorkspaceAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsClient>
        <Analytics />
      </AnalyticsClient>
    </Suspense>
  );
}
