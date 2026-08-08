import { getMarketplaceProgramsSummary } from "@/lib/fetchers/get-marketplace-programs-summary";
import { FeaturedPrograms } from "../featured-programs";
import { MARKETPLACE_HOME_ROWS } from "../home-sections";
import { MarketplaceCategoriesSection } from "../marketplace-categories-section";
import { MarketplaceProgramRow } from "../marketplace-program-row";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalHomePage() {
  const summary = await getMarketplaceProgramsSummary();

  return (
    <MarketplaceExternalShell variant="home">
      <div className="flex flex-col gap-10">
        <div className="-mx-4 -mt-8 px-2 sm:-mx-6 lg:-mx-8">
          <FeaturedPrograms
            programs={summary.featuredPrograms}
            showStatus={false}
          />
        </div>
        <MarketplaceCategoriesSection />
        {MARKETPLACE_HOME_ROWS.map((row, index) => (
          <MarketplaceProgramRow
            key={row.key}
            title={row.title}
            viewAllHref={row.viewAllHref}
            showViewAllCard={row.showViewAllCard}
            showStatus={false}
            programs={summary.categories[row.key] ?? summary[row.key]}
          />
        ))}
      </div>
    </MarketplaceExternalShell>
  );
}
