"use client";

import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { usePathname } from "next/navigation";
import { MarketplacePageTitle } from "./marketplace-page-title";
import { getMarketplaceCategoryFromPathname } from "./utils/category-slug";

export function MarketplaceListPageTitle() {
  const pathname = usePathname();
  const category = getMarketplaceCategoryFromPathname(pathname) ?? undefined;

  const title = category
    ? PROGRAM_CATEGORIES_MAP[category]?.label ?? category.replaceAll("_", " ")
    : "All Programs";

  return <MarketplacePageTitle title={title} />;
}
