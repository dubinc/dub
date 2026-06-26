import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button } from "@dub/ui";

export function MarketplaceEmptyState({
  isFiltered,
  onClearAllFilters,
}: {
  isFiltered: boolean;
  onClearAllFilters: () => void;
}) {
  return (
    <AnimatedEmptyState
      title="No programs found"
      description={
        isFiltered ? (
          <>
            Press{" "}
            <span className="text-content-default bg-bg-emphasis rounded-md px-1 py-0.5 text-xs font-semibold">
              Esc
            </span>{" "}
            to clear all filters.
          </>
        ) : (
          "There are no programs for you to discover yet."
        )
      }
      className="border-none md:min-h-[400px]"
      cardClassName="py-3"
      cardCount={2}
      cardContent={() => (
        <div className="flex grow items-center gap-4">
          <div className="size-9 shrink-0 rounded-full bg-neutral-200" />
          <div className="flex grow flex-col gap-2">
            <div className="h-2.5 w-full min-w-0 rounded bg-neutral-200" />
            <div className="h-2.5 w-12 min-w-0 rounded bg-neutral-200" />
          </div>
        </div>
      )}
      addButton={
        isFiltered ? (
          <Button
            type="button"
            text="Clear all filters"
            className="h-9 rounded-lg"
            onClick={onClearAllFilters}
          />
        ) : undefined
      }
    />
  );
}
