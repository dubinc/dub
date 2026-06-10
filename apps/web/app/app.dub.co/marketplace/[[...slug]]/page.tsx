import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { MarketplaceExternalRouter } from "@/ui/partners/program-marketplace/external/marketplace-external-router";
import { generateMarketplaceProgramStaticParams } from "@/ui/partners/program-marketplace/pages/marketplace-program-page";
import {
  categoryToSlug,
  getMarketplaceCanonicalUrl,
  getMarketplacePathFromSlug,
  getMarketplacePopularRedirectHref,
} from "@/ui/partners/program-marketplace/utils/urls";
import { Category } from "@dub/prisma/client";
import { constructMetadata } from "@dub/utils";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const revalidate = 3600;

export async function generateStaticParams() {
  const programParams = await generateMarketplaceProgramStaticParams();
  const categoryParams = Object.values(Category).map((category) => ({
    slug: ["c", categoryToSlug(category)],
  }));

  return [{ slug: [] }, { slug: ["all"] }, ...categoryParams, ...programParams];
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
  let image: string | undefined;

  if (segments.length === 1 && segments[0] === "all") {
    title = "All Programs";
    description = "Browse all partner programs on Dub.";
  } else if (
    segments.length === 1 &&
    segments[0] !== "all" &&
    segments[0] !== "popular"
  ) {
    const program = await getNetworkProgram({ slug: segments[0] });

    if (program) {
      title = program.name;
      description =
        program.description ||
        `Join the ${program.name} affiliate program on Dub's Partner Network.`;
      image = program.marketplaceHeaderImage || program.logo || undefined;
    } else {
      title = "Program Details";
    }
  } else if (segments.length === 2 && segments[0] === "c") {
    const category = Object.values(Category).find(
      (value) => categoryToSlug(value) === segments[1],
    );

    if (category) {
      const categoryMeta = PROGRAM_CATEGORIES_MAP[category];
      const label = categoryMeta?.label ?? category.replaceAll("_", " ");
      title = `${label} Programs`;
      description =
        categoryMeta?.listPageDescription ??
        `Partner programs in ${label.toLowerCase()}.`;
    }
  }

  return constructMetadata({
    title,
    description,
    image,
    canonicalUrl: getMarketplaceCanonicalUrl(pathname),
  });
}

export default async function MarketplaceExternalPage(props: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;

  if (slug?.length === 1 && slug[0] === "popular") {
    redirect(getMarketplacePopularRedirectHref(searchParams));
  }

  return <MarketplaceExternalRouter slug={slug} searchParams={searchParams} />;
}
