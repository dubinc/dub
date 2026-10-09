"use client";

import { MarketplaceProgramsSummarySchema } from "@/lib/zod/schemas/program-network";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import type * as z from "zod/v4";
import {
  FeaturedPrograms,
  FeaturedProgramsSkeleton,
} from "../featured-programs";
import { MARKETPLACE_HOME_ROWS } from "../home-sections";
import { MarketplaceCategoriesSection } from "../marketplace-categories-section";
import { MarketplaceProgramRow } from "../marketplace-program-row";

type MarketplaceProgramsSummary = z.infer<
  typeof MarketplaceProgramsSummarySchema
>;

export function MarketplaceHomePage() {
  const { data: summary } = useSWR<MarketplaceProgramsSummary>(
    "/api/network/programs/summary",
    fetcher,
    { revalidateOnFocus: false },
  );

  return (
    <div className="flex flex-col gap-10">
      {summary ? (
        <FeaturedPrograms programs={summary.featuredPrograms} />
      ) : (
        <FeaturedProgramsSkeleton />
      )}
      <MarketplaceCategoriesSection />
      {MARKETPLACE_HOME_ROWS.map((row) => (
        <MarketplaceProgramRow
          key={row.key}
          title={row.title}
          viewAllHref={row.viewAllHref}
          showViewAllCard={row.showViewAllCard}
          programs={
            summary
              ? summary.categories[row.key] ?? summary[row.key]
              : undefined
          }
        />
      ))}
    </div>
  );
}
