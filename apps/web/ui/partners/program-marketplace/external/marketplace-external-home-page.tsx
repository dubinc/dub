import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import { FeaturedPrograms } from "../featured-programs";
import { MarketplaceCategories } from "../marketplace-categories";
import { MARKETPLACE_HOME_ROWS } from "../marketplace-home-sections";
import { MarketplaceProgramRow } from "../marketplace-program-row";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalHomePage() {
  const [featuredPrograms, ...rowPrograms] = await Promise.all([
    getPublicNetworkPrograms({ featured: true, pageSize: 6 }),
    ...MARKETPLACE_HOME_ROWS.map((row) =>
      getPublicNetworkPrograms(row.fetchParams),
    ),
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
