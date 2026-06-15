import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { Category } from "@dub/prisma/client";
import { getMarketplaceExternalBasePath } from "./marketplace-external-filters";
import { MarketplaceExternalListPageClient } from "./marketplace-external-list-page-client";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export function MarketplaceExternalListPage({
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
      />
    </MarketplaceExternalShell>
  );
}
