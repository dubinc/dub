import Stats from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import AnalyticsClient from "./client";

export default function ProjectAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsClient>
        <Stats />
      </AnalyticsClient>
    </Suspense>
  );
}
