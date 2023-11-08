import Stats from "@/ui/stats";
import AnalyticsClient from "./client";
import { Suspense } from "react";
import LayoutLoader from "@/ui/layout/layout-loader";

export default function ProjectAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsClient>
        <Stats />
      </AnalyticsClient>
    </Suspense>
  );
}
