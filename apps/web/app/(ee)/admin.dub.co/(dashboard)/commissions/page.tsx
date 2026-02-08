import { Suspense } from "react";
import CommissionsPageClient from "./client";

export default async function CommissionsPage() {
  return (
    <Suspense>
      <CommissionsPageClient />
    </Suspense>
  );
}
