import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { MarketplaceExternalRouter } from "@/ui/program-marketplace/external/marketplace-external-router";
import { constructMetadata } from "@dub/utils";
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

  const year = new Date().getFullYear();

  let title = `Best SaaS affiliate programs in ${year}`;
  let description = `Browse and apply to the best SaaS affiliate programs on Dub's Partner Network.`;
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
      (value) => value.toLowerCase() === segments[1],
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
    canonicalUrl: `https://dub.co${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
  });
}

export default async function MarketplaceExternalPage(props: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await props.params;

  return <MarketplaceExternalRouter segments={segments} />;
}
