import { MarketplaceExternalListPage } from "@/ui/program-marketplace/external/marketplace-external-list-page";
import { getMarketplaceCanonicalUrl } from "@/ui/program-marketplace/utils/urls";
import { constructMetadata } from "@dub/utils";
import { Metadata } from "next";

// Rendered dynamically so the actual (filtered/sorted/paged) view is produced
// server-side and hydrates in place — no fallback swap.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return constructMetadata({
    title: "All Programs",
    description: "Browse all partner programs on Dub.",
    canonicalUrl: getMarketplaceCanonicalUrl("/marketplace/all"),
  });
}

export default async function MarketplaceAllPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <MarketplaceExternalListPage slug={["all"]} searchParams={searchParams} />
  );
}
