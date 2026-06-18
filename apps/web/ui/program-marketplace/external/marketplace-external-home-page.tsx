import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import { FeaturedPrograms } from "../featured-programs";
import { MARKETPLACE_HOME_ROWS } from "../home-sections";
import { MarketplaceCategories } from "../marketplace-categories";
import { MarketplaceProgramRow } from "../marketplace-program-row";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

async function fetchHomePrograms(
  params: Parameters<typeof getPublicNetworkPrograms>[0],
) {
  try {
    return await getPublicNetworkPrograms(params);
  } catch (error) {
    console.error("Failed to fetch marketplace home programs:", error);
    return [];
  }
}

export async function MarketplaceExternalHomePage() {
  const [featuredPrograms, ...rowPrograms] = await Promise.all([
    fetchHomePrograms({ featured: true, pageSize: 6 }),
    ...MARKETPLACE_HOME_ROWS.map((row) => fetchHomePrograms(row.fetchParams)),
  ]);

  return (
    <MarketplaceExternalShell variant="home">
      <div className="flex flex-col gap-10">
        <div className="-mx-4 -mt-8 px-2 sm:-mx-6 lg:-mx-8">
          <FeaturedPrograms programs={featuredPrograms} showStatus={false} />
        </div>
        <MarketplaceCategories />
        {MARKETPLACE_HOME_ROWS.map((row, index) => (
          <MarketplaceProgramRow
            key={row.key}
            variant="home"
            title={row.title}
            viewAllHref={row.viewAllHref}
            programs={rowPrograms[index]}
            showViewAllCard={row.showViewAllCard}
            showStatus={false}
          />
        ))}
      </div>
    </MarketplaceExternalShell>
  );
}
