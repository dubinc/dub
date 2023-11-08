import Stats from "@/ui/stats";
import { Suspense } from "react";
import AnalyticsClient from "./client";
import LayoutLoader from "@/ui/layout/layout-loader";

export default function LinkAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsClient>
        <Stats />
      </AnalyticsClient>
    </Suspense>
  );
}
