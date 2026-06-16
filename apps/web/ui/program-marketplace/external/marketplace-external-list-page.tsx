import { getPublicNetworkProgramFilterCounts } from "@/lib/fetchers/get-public-network-program-filter-counts";
import {
  getPublicNetworkPrograms,
  getPublicNetworkProgramsCount,
} from "@/lib/fetchers/get-public-network-programs";
import {
  isValidPublicMarketplaceQuery,
  parsePublicMarketplaceQuery,
} from "@/lib/marketplace/parse-public-marketplace-query";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { Category } from "@dub/prisma/client";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { getMarketplaceExternalBasePath } from "./marketplace-external-filters";
import {
  MarketplaceExternalListPageClient,
  type MarketplaceExternalListInitialData,
} from "./marketplace-external-list-page-client";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

// Cache the list payload (keyed by parsed query) so this dynamic route doesn't
// hit the DB on every request.
const getMarketplaceListData = unstable_cache(
  async (params: ReturnType<typeof parsePublicMarketplaceQuery>) => {
    const [programs, totalCount, filterCounts] = await Promise.all([
      getPublicNetworkPrograms(params),
      getPublicNetworkProgramsCount(params),
      getPublicNetworkProgramFilterCounts(params),
    ]);

    return { programs, totalCount, filterCounts };
  },
  ["marketplace-external-list"],
  { revalidate: 3600 },
);

export async function MarketplaceExternalListPage({
  slug,
  fixedCategory,
  searchParams,
}: {
  slug?: string[];
  fixedCategory?: Category;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const basePath = getMarketplaceExternalBasePath({ slug });

  if (!isValidPublicMarketplaceQuery(searchParams ?? {}, fixedCategory)) {
    redirect(basePath);
  }

  const categoryMeta = fixedCategory
    ? PROGRAM_CATEGORIES_MAP[fixedCategory]
    : undefined;
  const year = new Date().getFullYear();

  const params = parsePublicMarketplaceQuery(searchParams ?? {}, fixedCategory);

  const { programs, totalCount, filterCounts } =
    await getMarketplaceListData(params);

  const initialData: MarketplaceExternalListInitialData = {
    programs,
    totalCount,
    filterCounts,
    params: {
      rewardType: params.rewardType,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page ?? 1,
    },
  };

  return (
    <MarketplaceExternalShell
      variant="list"
      title={
        categoryMeta
          ? `Best ${categoryMeta.label} Affiliate Programs in ${year}`
          : undefined
      }
      description={categoryMeta?.listPageDescription}
    >
      <MarketplaceExternalListPageClient
        basePath={basePath}
        fixedCategory={fixedCategory}
        initialData={initialData}
      />
    </MarketplaceExternalShell>
  );
}
