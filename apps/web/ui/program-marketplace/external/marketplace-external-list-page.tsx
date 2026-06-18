import { getNetworkProgramCounts } from "@/lib/fetchers/get-network-program-counts";
import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import { EXTERNAL_MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/parse-public-marketplace-query";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { Category } from "@dub/prisma/client";
import { getMarketplaceExternalBasePath } from "./marketplace-external-filters";
import { MarketplaceExternalListPageClient } from "./marketplace-external-list-page-client";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalListPage({
  slug,
  fixedCategory,
}: {
  slug?: string[];
  fixedCategory?: Category;
}) {
  const basePath = getMarketplaceExternalBasePath({ slug });
  const categoryMeta = fixedCategory
    ? PROGRAM_CATEGORIES_MAP[fixedCategory]
    : undefined;

  const [initialPrograms, initialCounts] = await Promise.all([
    getPublicNetworkPrograms({
      category: fixedCategory,
      page: 1,
      pageSize: EXTERNAL_MARKETPLACE_PAGE_SIZE,
    }),
    getNetworkProgramCounts({ category: fixedCategory }),
  ]);

  return (
    <MarketplaceExternalShell
      variant="list"
      title={
        categoryMeta ? (
          <>
            {categoryMeta.label} partner
            <br />
            programs
          </>
        ) : undefined
      }
      description={categoryMeta?.listPageDescription}
    >
      <MarketplaceExternalListPageClient
        basePath={basePath}
        fixedCategory={fixedCategory}
        initialPrograms={initialPrograms}
        initialCounts={initialCounts}
      />
    </MarketplaceExternalShell>
  );
}
