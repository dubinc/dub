"use client";

import { NetworkProgramProps } from "@/lib/types";
import { cn, fetcher } from "@dub/utils";
import useSWR from "swr";
import { MarketplaceEmptyState } from "../marketplace-empty-state";
import {
  MarketplaceProgramCard,
  MarketplaceProgramCardSkeleton,
} from "../program-card";

const POPULAR_PAGE_SIZE = 12;

export function MarketplacePopularProgramsPage() {
  const {
    data: programs,
    error,
    isValidating,
  } = useSWR<NetworkProgramProps[]>(
    `/api/network/programs?sortBy=popularity&pageSize=${POPULAR_PAGE_SIZE}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  if (error) {
    return (
      <div className="text-content-subtle py-12 text-sm">
        Failed to load programs
      </div>
    );
  }

  if (programs?.length === 0) {
    return <MarketplaceEmptyState isFiltered={false} onClearAllFilters={() => {}} />;
  }

  return (
    <div
      className={cn(
        "@4xl/page:grid-cols-3 @xl/page:grid-cols-2 grid grid-cols-1 gap-4 transition-opacity lg:gap-6",
        isValidating && "opacity-50",
      )}
    >
      {programs
        ? programs.map((program) => (
            <MarketplaceProgramCard key={program.id} program={program} />
          ))
        : [...Array(3)].map((_, idx) => (
            <MarketplaceProgramCardSkeleton key={idx} />
          ))}
    </div>
  );
}
