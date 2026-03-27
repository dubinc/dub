import { Suspense } from "react";
import PayoutsPageClient from "./page-client";

export default async function PayoutsPage() {
  return (
    <Suspense>
      <PayoutsPageClient />
    </Suspense>
  );
}
