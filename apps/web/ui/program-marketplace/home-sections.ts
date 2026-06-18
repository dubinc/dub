import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { Category } from "@prisma/client";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "./utils/urls";

export const MARKETPLACE_HOME_ROW_PAGE_SIZE = 5;

export const MARKETPLACE_HOME_CATEGORIES = [
  Category.Productivity,
  Category.Artificial_Intelligence,
  Category.Marketing,
  Category.Development,
  Category.Design,
  Category.Finance,
  Category.Ecommerce,
  Category.Health,
  Category.Consumer,
  Category.Education,
] as const;

type MarketplaceHomeRowFetchParams = {
  sortBy?: "name" | "recency" | "popularity";
  category?: Category;
  pageSize: number;
};

export type MarketplaceHomeRow = {
  key: string;
  title: string;
  viewAllHref: string;
  apiPath: string;
  fetchParams: MarketplaceHomeRowFetchParams;
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
    apiPath: `/api/network/programs?sortBy=popularity&pageSize=${MARKETPLACE_HOME_ROW_PAGE_SIZE}`,
    fetchParams: {
      sortBy: "popularity",
      pageSize: MARKETPLACE_HOME_ROW_PAGE_SIZE,
    },
    showViewAllCard: true,
  },
  {
    key: "new",
    title: "New",
    viewAllHref: getMarketplaceAllHref({
      sortBy: "recency",
      sortOrder: "desc",
    }),
    apiPath: `/api/network/programs?sortBy=recency&pageSize=${MARKETPLACE_HOME_ROW_PAGE_SIZE}`,
    fetchParams: {
      sortBy: "recency",
      pageSize: MARKETPLACE_HOME_ROW_PAGE_SIZE,
    },
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
      apiPath: `/api/network/programs?category=${category}&pageSize=${MARKETPLACE_HOME_ROW_PAGE_SIZE}`,
      fetchParams: {
        category,
        pageSize: MARKETPLACE_HOME_ROW_PAGE_SIZE,
      },
      showViewAllCard: true,
    };
  },
);

export const MARKETPLACE_HOME_ROWS: MarketplaceHomeRow[] = [
  ...featuredHomeRows,
  ...categoryHomeRows,
];
