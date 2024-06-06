import Events from "@/ui/analytics/events";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import AnalyticsClient from "../analytics/client";

export default function WorkspaceAnalyticsEvents() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsClient>
        <Events />
      </AnalyticsClient>
    </Suspense>
  );
}
