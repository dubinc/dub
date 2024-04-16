import { Suspense } from "react";
import WorkspaceBillingClient from "./page-client";

export default function WorkspaceBilling() {
  return (
    <Suspense>
      <WorkspaceBillingClient />
    </Suspense>
  );
}
