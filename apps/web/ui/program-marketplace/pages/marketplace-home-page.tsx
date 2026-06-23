"use client";

import { FeaturedPrograms } from "../featured-programs";
import { MARKETPLACE_HOME_ROWS } from "../home-sections";
import { MarketplaceCategoriesSection } from "../marketplace-categories-section";
import { MarketplaceProgramRow } from "../marketplace-program-row";

export function MarketplaceHomePage() {
  return (
    <div className="flex flex-col gap-10">
      <FeaturedPrograms />
      <MarketplaceCategoriesSection />
      {MARKETPLACE_HOME_ROWS.map((row) => (
        <MarketplaceProgramRow
          key={row.key}
          variant="home"
          title={row.title}
          viewAllHref={row.viewAllHref}
          apiPath={row.apiPath}
          showViewAllCard={row.showViewAllCard}
        />
      ))}
    </div>
  );
}
