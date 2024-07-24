import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";

export default function DemoAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <Analytics demoPage />
    </Suspense>
  );
}
