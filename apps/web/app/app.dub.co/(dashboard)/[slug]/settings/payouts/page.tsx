import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import { PayoutsPageClient } from "./page-client";

export default function Payouts() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <h1 className="text-2xl font-semibold tracking-tight text-black">
        Payouts
      </h1>
      <PayoutsPageClient />
    </Suspense>
  );
}
