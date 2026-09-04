import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { MarketplaceExternalRouter } from "@/ui/program-marketplace/external/marketplace-external-router";
import { APP_DOMAIN, constructMetadata } from "@dub/utils";
import { Category } from "@prisma/client";
import { Metadata } from "next";

export {
  generateStaticParams,
  revalidate,
} from "@/ui/program-marketplace/utils/default-exports";

export async function generateMetadata(props: {
  params: Promise<{ segments?: string[] }>;
}): Promise<Metadata> {
  const { segments = [] } = await props.params;
  const pathname = `/marketplace${segments.length > 0 ? `/${segments.join("/")}` : ""}`;

  const currentYear = new Date().getFullYear();

  let title = `Best SaaS affiliate programs in ${currentYear}`;
  let description = `Browse and apply to the best SaaS affiliate programs on Dub's Partner Network.`;
  let image = "https://assets.dub.co/og/marketplace.jpg";

  if (segments.length === 1 && segments[0] === "all") {
    title = `Top SaaS affiliate programs in ${currentYear}`;
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
        `Join the ${program.name} affiliate program on Dub's Program Marketplace.`;
      image =
        program.marketplaceHeaderImage ||
        `${APP_DOMAIN}/api/og/program?slug=${program.slug}`;
    }
  } else if (segments.length === 2 && segments[0] === "c") {
    const category = Object.values(Category).find(
      (value) => value.toLowerCase() === segments[1],
    );

    if (category) {
      // categoryMeta should always return a value, but just in case
      const categoryMeta = PROGRAM_CATEGORIES_MAP[category];
      const label = categoryMeta?.label ?? category.replaceAll("_", " ");
      title = `Best ${label} SaaS Affiliate Programs in ${currentYear}`;
      description =
        categoryMeta?.listPageDescription ??
        `Browse the best ${label} affiliate programs on Dub's Program Marketplace.`;
      image = `${APP_DOMAIN}/api/og/program/categories?categorySlug=${category.toLowerCase()}`;
    }
  }

  return constructMetadata({
    title,
    description,
    image,
    canonicalUrl: `https://dub.co${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
  });
}

export default async function MarketplaceExternalPage(props: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await props.params;

  return <MarketplaceExternalRouter segments={segments} />;
}
