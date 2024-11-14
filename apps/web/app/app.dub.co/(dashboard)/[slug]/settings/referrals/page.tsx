import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import ReferralsPageClient from "./page-client";

export default async function ReferralsPage() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <h1 className="text-2xl font-semibold tracking-tight text-black">
        Referrals
      </h1>
      <ReferralsPageClient />
    </Suspense>
  );
}
