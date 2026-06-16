import { MarketplaceExternalHomePage } from "@/ui/program-marketplace/external/marketplace-external-home-page";
import { getMarketplaceCanonicalUrl } from "@/ui/program-marketplace/utils/urls";
import { constructMetadata } from "@dub/utils";
import { Metadata } from "next";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const year = new Date().getFullYear();

  return constructMetadata({
    title: `Best SaaS Affiliate Programs in ${year}`,
    description: `Browse and apply to the best SaaS affiliate programs on Dub's Partner Network.`,
    canonicalUrl: getMarketplaceCanonicalUrl("/marketplace"),
  });
}

export default function MarketplaceHomePage() {
  return <MarketplaceExternalHomePage />;
}
