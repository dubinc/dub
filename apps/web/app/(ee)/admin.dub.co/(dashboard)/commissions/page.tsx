import { Suspense } from "react";
import CommissionsPageClient from "./page-client";

export default async function CommissionsPage() {
  return (
    <Suspense>
      <CommissionsPageClient />
    </Suspense>
  );
}
