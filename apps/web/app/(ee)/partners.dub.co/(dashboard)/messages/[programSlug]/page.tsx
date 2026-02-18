import { Suspense } from "react";
import { PartnerMessagesProgramPageClient } from "./page-client";

export default function PartnerMessagesProgramPage() {
  return (
    <Suspense fallback={null}>
      <PartnerMessagesProgramPageClient />
    </Suspense>
  );
}
