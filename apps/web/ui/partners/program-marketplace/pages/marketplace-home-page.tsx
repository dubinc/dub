"use client";

import { FeaturedPrograms } from "../featured-programs";
import { MarketplaceCategories } from "../marketplace-categories";
import { MARKETPLACE_HOME_ROWS } from "../marketplace-home-sections";
import { MarketplaceProgramRow } from "../marketplace-program-row";

export function MarketplaceHomePage() {
  return (
    <div className="flex flex-col gap-10">
      <FeaturedPrograms />
      <MarketplaceCategories />
      {MARKETPLACE_HOME_ROWS.map((row) => (
        <MarketplaceProgramRow
          key={row.key}
          title={row.title}
          viewAllHref={row.viewAllHref}
          apiPath={row.apiPath}
          showViewAllCard={row.showViewAllCard}
        />
      ))}
    </div>
  );
}
