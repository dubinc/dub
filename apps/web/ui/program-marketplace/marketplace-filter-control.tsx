"use client";

import { FilterBars } from "@dub/ui/icons";
import { cn } from "@dub/utils";

export function MarketplaceFilterControl({
  activeFilterCount,
  onClear,
  className,
}: {
  activeFilterCount: number;
  onClear: () => void;
  className?: string;
}) {
  if (activeFilterCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg border border-neutral-200 bg-white",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-2 px-3">
        <FilterBars className="size-4 shrink-0 text-neutral-900" />
        <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-black text-[0.625rem] font-medium leading-none text-white">
          {activeFilterCount}
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className={cn(
          "flex h-9 shrink-0 items-center gap-2 rounded-none border-l border-neutral-200 bg-white",
          "px-4 text-sm font-medium text-neutral-600",
          "transition-colors hover:bg-neutral-100",
        )}
      >
        Clear
      </button>
    </div>
  );
}
