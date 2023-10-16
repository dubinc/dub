import Stats from "@/ui/stats";
import AnalyticsAuth from "./auth";
import { Suspense } from "react";
import LayoutLoader from "@/ui/layout/layout-loader";

export default function ProjectAnalytics() {
  return (
    <AnalyticsAuth>
      <Suspense fallback={<LayoutLoader />}>
        <Stats />
      </Suspense>
    </AnalyticsAuth>
  );
}
