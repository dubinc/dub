import LayoutLoader from "@/ui/layout/layout-loader";
import Stats from "@/ui/stats";
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
