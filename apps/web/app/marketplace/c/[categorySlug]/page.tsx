import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { MarketplaceExternalListPage } from "@/ui/program-marketplace/external/marketplace-external-list-page";
import {
  getMarketplaceCanonicalUrl,
  slugToCategory,
} from "@/ui/program-marketplace/utils/urls";
import { constructMetadata } from "@dub/utils";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// Rendered dynamically so the actual (filtered/sorted/paged) view is produced
// server-side and hydrates in place — no fallback swap.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const year = new Date().getFullYear();
  const { categorySlug } = await props.params;
  const category = slugToCategory(categorySlug);

  if (!category) {
    return constructMetadata({ title: "Programs" });
  }

  const categoryMeta = PROGRAM_CATEGORIES_MAP[category];
  const label = categoryMeta?.label ?? category.replaceAll("_", " ");

  return constructMetadata({
    title: `Best ${label} Affiliate Programs in ${year}`,
    description:
      categoryMeta?.listPageDescription ??
      `Browse and apply to ${label.toLowerCase()} affiliate programs on Dub's Partner Network.`,
    canonicalUrl: getMarketplaceCanonicalUrl(`/marketplace/c/${categorySlug}`),
  });
}

export default async function MarketplaceCategoryPage(props: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { categorySlug } = await props.params;
  const searchParams = await props.searchParams;

  const category = slugToCategory(categorySlug);

  if (!category) {
    notFound();
  }

  return (
    <MarketplaceExternalListPage
      slug={["c", categorySlug]}
      fixedCategory={category}
      searchParams={searchParams}
    />
  );
}
