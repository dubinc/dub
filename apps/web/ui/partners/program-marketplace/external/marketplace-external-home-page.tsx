import { FeaturedPrograms } from "../featured-programs";
import { fetchMarketplaceHomePrograms } from "../fetch-marketplace-home-programs";
import { MarketplaceCategories } from "../marketplace-categories";
import { MARKETPLACE_HOME_ROWS } from "../marketplace-home-sections";
import { MarketplaceProgramRow } from "../marketplace-program-row";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalHomePage() {
  const { featuredPrograms, rowPrograms } =
    await fetchMarketplaceHomePrograms();

  return (
    <MarketplaceExternalShell variant="home">
      <div className="flex flex-col gap-10">
        <FeaturedPrograms programs={featuredPrograms} showStatus={false} />
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
