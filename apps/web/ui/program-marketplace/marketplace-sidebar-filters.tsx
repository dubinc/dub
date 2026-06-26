"use client";

import { getMarketplaceHref } from "@/ui/program-marketplace/utils/urls";
import { ChevronLeft, Filter, useKeyboardShortcut } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useProgramNetworkFilters } from "./use-program-network-filters";

export function MarketplaceSidebarFilters() {
  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = useProgramNetworkFilters();

  useKeyboardShortcut("Escape", onRemoveAll, {
    enabled: isFiltered,
    priority: 1,
  });

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={getMarketplaceHref()}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-800 transition-all duration-75",
          "hover:bg-neutral-200/50 active:bg-neutral-200/80",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
        )}
      >
        <ChevronLeft className="size-3 text-neutral-400 transition-transform group-hover:-translate-x-0.5" />
        Program marketplace
      </Link>
      <Filter.Sidebar
        filters={filters}
        activeFilters={activeFilters}
        onSelect={onSelect}
        onRemove={onRemove}
        optionClassName="hover:bg-neutral-200/50 active:bg-neutral-200/80"
      />
    </div>
  );
}
