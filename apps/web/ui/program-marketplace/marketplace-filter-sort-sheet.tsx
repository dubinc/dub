"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  type ActiveFilterInput,
  Button,
  type FilterConfig,
  type FilterOption,
  FilterOptionRow,
  normalizeActiveFilter,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Drawer } from "vaul";
import { MARKETPLACE_SORT_OPTIONS } from "./utils/constants";

export type MarketplaceFilterSortSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig[];
  activeFilters?: ActiveFilterInput[];
  onSelect: (key: string, value: string) => void;
  onRemove: (key: string, value?: string) => void;
  onClearAll: () => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  badgeCount: number;
};

function getSectionBadgeCount(
  filterKey: string,
  activeFilters?: ActiveFilterInput[],
) {
  if (!activeFilters?.length) return 0;
  const raw = activeFilters.find((f) => f.key === filterKey);
  if (!raw) return 0;
  return normalizeActiveFilter(raw).values.length;
}

export function MarketplaceFilterSortSheet({
  open,
  onOpenChange,
  filters,
  activeFilters,
  onSelect,
  onRemove,
  onClearAll,
  sortBy,
  sortOrder,
  onSortChange,
  badgeCount,
}: MarketplaceFilterSortSheetProps) {
  const visibleFilters = filters.filter(
    (filter) => !filter.hideInFilterDropdown && filter.type !== "range",
  );

  const isOptionSelected = (
    filterKey: string,
    value: FilterOption["value"],
  ) => {
    const rawActiveFilter = activeFilters?.find(
      (filter) => filter.key === filterKey,
    );
    if (!rawActiveFilter) return false;

    return normalizeActiveFilter(rawActiveFilter).values.some((v) => {
      if (typeof v === "string" && typeof value === "string") {
        return v.toLowerCase() === value.toLowerCase();
      }
      return v === value;
    });
  };

  const toggleOption = (filter: FilterConfig, value: FilterOption["value"]) => {
    if (isOptionSelected(filter.key, value)) {
      onRemove(filter.key, String(value));
      return;
    }
    onSelect(filter.key, String(value));
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="bg-bg-subtle fixed inset-0 z-50 bg-opacity-10 backdrop-blur" />
        <Drawer.Content className="border-border-subtle bg-bg-default fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[85vh] flex-col rounded-t-[10px] border-t outline-none">
          <div className="flex shrink-0 items-center justify-center py-3">
            <div className="bg-border-default h-1 w-12 rounded-full" />
          </div>

          <div className="border-border-subtle flex shrink-0 items-center justify-between gap-3 border-b px-4 pb-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-800">
                Filter and sort
              </h2>
              {badgeCount > 0 ? (
                <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-medium leading-none text-white">
                  {badgeCount}
                </div>
              ) : null}
            </div>

            <Button
              text="Clear"
              variant="secondary"
              className="h-8 w-fit shrink-0 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors hover:bg-neutral-50"
              onClick={() => {
                onClearAll();
                onOpenChange(false);
              }}
            />
          </div>

          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2">
            <Accordion
              type="multiple"
              defaultValue={["sort", ...visibleFilters.map((f) => f.key)]}
              className="flex flex-col"
            >
              <AccordionItem value="sort" className="border-none py-0">
                <AccordionTrigger
                  className={cn(
                    "rounded-md py-3 font-semibold text-neutral-600",
                    "hover:bg-bg-subtle hover:no-underline",
                    "[&>svg]:size-4 [&>svg]:text-neutral-400",
                  )}
                >
                  Sort by
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <div className="flex flex-col gap-1">
                    {MARKETPLACE_SORT_OPTIONS.map(({ label, value, order }) => {
                      const selected = sortBy === value && sortOrder === order;

                      return (
                        <button
                          key={`${value}-${order}`}
                          type="button"
                          onClick={() => onSortChange(value, order)}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                        >
                          <div
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border",
                              selected
                                ? "border-neutral-900"
                                : "border-neutral-300",
                            )}
                          >
                            {selected ? (
                              <div className="size-2 rounded-full bg-neutral-900" />
                            ) : null}
                          </div>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {visibleFilters.map((filter) => {
                const sectionBadge = getSectionBadgeCount(
                  filter.key,
                  activeFilters,
                );

                return (
                  <AccordionItem
                    key={filter.key}
                    value={filter.key}
                    className="border-none py-0"
                  >
                    <AccordionTrigger
                      className={cn(
                        "rounded-md py-3 font-semibold text-neutral-600",
                        "hover:bg-bg-subtle hover:no-underline",
                        "[&>svg]:size-4 [&>svg]:text-neutral-400",
                      )}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {filter.label}
                        {sectionBadge > 0 ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black text-[0.625rem] font-medium leading-none text-white">
                            {sectionBadge}
                          </span>
                        ) : null}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 pt-0">
                      {filter.options === null ? (
                        <p className="px-2 py-2 text-sm text-neutral-400">
                          Loading...
                        </p>
                      ) : filter.options.length === 0 ? (
                        <p className="px-2 py-2 text-sm text-neutral-400">
                          No options
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {filter.options.map((option) => (
                            <FilterOptionRow
                              key={String(option.value)}
                              filter={filter}
                              option={option}
                              checked={isOptionSelected(
                                filter.key,
                                option.value,
                              )}
                              onToggle={() =>
                                toggleOption(filter, option.value)
                              }
                            />
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
