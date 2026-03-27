import { Suspense } from "react";
import RevenuePageClient from "./page-client";

export default async function RevenuePage() {
  return (
    <Suspense>
      <RevenuePageClient />
    </Suspense>
  );
}
