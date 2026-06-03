"use client";

import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { useRouterStuff } from "@dub/ui";
import { useMemo } from "react";
import { MarketplaceFilterControl } from "../marketplace-filter-control";
import ProgramSort from "../program-sort";

export function MarketplaceExternalListToolbar() {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParamsObj.rewardType) count += 1;
    return count;
  }, [searchParamsObj.rewardType]);

  const onClearFilters = () => {
    queryParams({
      del: ["rewardType", "page"],
    });
  };

  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <MarketplaceFilterControl
          activeFilterCount={activeFilterCount}
          onClear={onClearFilters}
        />
        <ProgramSort />
      </div>
      <SearchBoxPersisted
        placeholder="Search the marketplace..."
        inputClassName="md:w-[19rem] h-9 rounded-lg"
      />
    </div>
  );
}
