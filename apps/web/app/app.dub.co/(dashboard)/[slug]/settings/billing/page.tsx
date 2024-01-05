import { Suspense } from "react";
import ProjectBillingClient from "./page-client";

export default function ProjectBilling() {
  return (
    <Suspense>
      <ProjectBillingClient />
    </Suspense>
  );
}
