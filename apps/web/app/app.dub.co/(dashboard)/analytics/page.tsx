import LayoutLoader from "@/ui/layout/layout-loader";
import Stats from "@/ui/stats";
import { Suspense } from "react";
import AnalyticsAuth from "./auth";

export default function LinkAnalytics({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsAuth searchParams={searchParams}>
        <Stats />
      </AnalyticsAuth>
    </Suspense>
  );
}
