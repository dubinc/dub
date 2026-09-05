import LayoutLoader from "@/ui/layout/layout-loader";
import { MarketplaceRouter } from "@/ui/program-marketplace/marketplace-router";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function MarketplacePage({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <MarketplaceSegments params={params} />
    </Suspense>
  );
}

async function MarketplaceSegments({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await params;

  return <MarketplaceRouter segments={segments} />;
}
