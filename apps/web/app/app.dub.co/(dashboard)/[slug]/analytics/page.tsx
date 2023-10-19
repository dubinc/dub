import Stats from "@/ui/stats";
import AnalyticsAuth from "./auth";
import { Suspense } from "react";
import LayoutLoader from "@/ui/layout/layout-loader";

export default function ProjectAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsAuth>
        <Stats />
      </AnalyticsAuth>
    </Suspense>
  );
}
