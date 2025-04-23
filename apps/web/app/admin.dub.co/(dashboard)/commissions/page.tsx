import { Suspense } from "react";
import PayoutsPageClient from "./client";

export default async function PayoutsPage() {
  return (
    <Suspense>
      <PayoutsPageClient />
    </Suspense>
  );
}
