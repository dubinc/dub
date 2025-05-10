import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";

export default function AdminAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <div className="w-full">
        <Analytics adminPage />
      </div>
    </Suspense>
  );
}
