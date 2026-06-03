import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { MarketplaceExternalRouter } from "@/ui/partners/program-marketplace/external/marketplace-external-router";
import {
  getMarketplaceCanonicalUrl,
  getMarketplacePathFromSlug,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { generateMarketplaceProgramStaticParams } from "@/ui/partners/program-marketplace/pages/marketplace-program-page";
import { categoryToSlug } from "@/ui/partners/program-marketplace/utils/category-slug";
import { Category } from "@dub/prisma/client";
import { constructMetadata } from "@dub/utils";
import { Metadata } from "next";

export const revalidate = 3600;

export async function generateStaticParams() {
  const programParams = await generateMarketplaceProgramStaticParams();
  const categoryParams = Object.values(Category).map((category) => ({
    slug: ["c", categoryToSlug(category)],
  }));

  return [
    { slug: [] },
    { slug: ["all"] },
    { slug: ["popular"] },
    ...categoryParams,
    ...programParams,
  ];
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const pathname = getMarketplacePathFromSlug(slug);
  const segments = slug ?? [];

  let title = "Program Marketplace";
  let description =
    "Discover and apply to partner programs on Dub's Partner Network.";

  if (segments.length === 1 && segments[0] === "all") {
    title = "All Programs";
    description = "Browse all partner programs on Dub.";
  } else if (segments.length === 1 && segments[0] === "popular") {
    title = "Popular Programs";
    description = "The most popular partner programs on Dub.";
  } else if (segments.length === 1) {
    title = "Program Details";
  } else if (segments.length === 2 && segments[0] === "c") {
    const category = Object.values(Category).find(
      (value) => categoryToSlug(value) === segments[1],
    );

    if (category) {
      const label =
        PROGRAM_CATEGORIES_MAP[category]?.label ??
        category.replaceAll("_", " ");
      title = `${label} Programs`;
      description = `Partner programs in ${label.toLowerCase()}.`;
    }
  }

  return constructMetadata({
    title,
    description,
    canonicalUrl: getMarketplaceCanonicalUrl(pathname),
  });
}

export default async function MarketplaceExternalPage(props: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;

  return <MarketplaceExternalRouter slug={slug} searchParams={searchParams} />;
}
