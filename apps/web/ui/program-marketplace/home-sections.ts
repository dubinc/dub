import { MARKETPLACE_HOME_CATEGORIES } from "@/lib/marketplace/home-sections";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "./utils/urls";

export type MarketplaceHomeRow = {
  key: string;
  title: string;
  viewAllHref: string;
  showViewAllCard: true;
};

const featuredHomeRows: MarketplaceHomeRow[] = [
  {
    key: "most-popular",
    title: "Most popular",
    viewAllHref: getMarketplaceAllHref({
      sortBy: "popularity",
      sortOrder: "desc",
    }),
    showViewAllCard: true,
  },
  {
    key: "new",
    title: "New",
    viewAllHref: getMarketplaceAllHref({
      sortBy: "recency",
      sortOrder: "desc",
    }),
    showViewAllCard: true,
  },
];

const categoryHomeRows: MarketplaceHomeRow[] = MARKETPLACE_HOME_CATEGORIES.map(
  (category) => {
    const label =
      PROGRAM_CATEGORIES_MAP[category]?.label ?? category.replaceAll("_", " ");

    return {
      key: category,
      title: label,
      viewAllHref: getMarketplaceCategoryHref(category),
      showViewAllCard: true,
    };
  },
);

export const MARKETPLACE_HOME_ROWS: MarketplaceHomeRow[] = [
  ...featuredHomeRows,
  ...categoryHomeRows,
];
