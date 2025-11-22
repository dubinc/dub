import { Suspense } from "react";
import PaypalPayoutsPageClient from "./client";

export default async function PaypalPayoutsPage() {
  return (
    <Suspense>
      <PaypalPayoutsPageClient />
    </Suspense>
  );
}
