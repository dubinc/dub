"use client";

import { SearchBoxPersisted } from "@/ui/shared/search-box";
import ProgramSort from "../program-sort";

export function MarketplaceExternalListToolbar() {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <ProgramSort />
      <SearchBoxPersisted
        placeholder="Search the marketplace..."
        inputClassName="md:w-[19rem] h-9 rounded-lg"
      />
    </div>
  );
}
