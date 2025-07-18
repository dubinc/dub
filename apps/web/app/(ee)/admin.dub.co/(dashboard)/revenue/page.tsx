import { Suspense } from "react";
import RevenuePageClient from "./client";

export default async function RevenuePage() {
  return (
    <Suspense>
      <RevenuePageClient />
    </Suspense>
  );
}
