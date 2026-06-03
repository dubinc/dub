import { getMarketplacePopularRedirectHref } from "@/ui/partners/program-marketplace/get-marketplace-href";
import { MarketplaceRouter } from "@/ui/partners/program-marketplace/marketplace-router";
import {
  generateMarketplaceProgramStaticParams,
  revalidate,
} from "@/ui/partners/program-marketplace/pages/marketplace-program-page";
import { redirect } from "next/navigation";

export { revalidate };

export async function generateStaticParams() {
  return generateMarketplaceProgramStaticParams();
}

export default async function MarketplacePage(props: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;

  if (slug?.length === 1 && slug[0] === "popular") {
    redirect(getMarketplacePopularRedirectHref(searchParams));
  }

  return <MarketplaceRouter slug={slug} variant="internal" />;
}
