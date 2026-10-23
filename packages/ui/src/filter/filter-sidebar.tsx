"use client";

import { cn } from "@dub/utils";
import { useCallback, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";
import { FilterOptionRow, FilterOptionRowsSkeleton } from "./filter-option-row";
import {
  ActiveFilterInput,
  Filter,
  FilterOption,
  normalizeActiveFilter,
} from "./types";

type FilterSidebarProps = {
  filters: Filter[];
  activeFilters?: ActiveFilterInput[];
  onSelect: (key: string, value: FilterOption["value"]) => void;
  onRemove: (key: string, value: FilterOption["value"]) => void;
  className?: string;
  optionClassName?: string;
  defaultOpen?: string[];
};

export function FilterSidebar({
  filters,
  activeFilters,
  onSelect,
  onRemove,
  className,
  optionClassName,
  defaultOpen,
}: FilterSidebarProps) {
  const visibleFilters = useMemo(
    () =>
      filters.filter(
        (filter) => !filter.hideInFilterDropdown && filter.type !== "range",
      ),
    [filters],
  );

  const defaultOpenSections = useMemo(
    () => defaultOpen ?? visibleFilters.map(({ key }) => key),
    [defaultOpen, visibleFilters],
  );

  const isOptionSelected = useCallback(
    (filterKey: string, value: FilterOption["value"]) => {
      const rawActiveFilter = activeFilters?.find(
        (filter) => filter.key === filterKey,
      );
      if (!rawActiveFilter) return false;

      return normalizeActiveFilter(rawActiveFilter).values.some((v) =>
        valuesMatch(v, value),
      );
    },
    [activeFilters],
  );

  const toggleOption = useCallback(
    (filter: Filter, value: FilterOption["value"]) => {
      const filterKey = filter.key;
      const option = filter.options?.find((o) => valuesMatch(o.value, value));

      if (option?.disabled) {
        return;
      }

      if (isOptionSelected(filterKey, value)) {
        onRemove(filterKey, value);
        return;
      }

      onSelect(filterKey, value);
    },
    [isOptionSelected, onRemove, onSelect],
  );

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpenSections}
      className={cn("flex flex-col gap-1", className)}
    >
      {visibleFilters.map((filter) => (
        <AccordionItem
          key={filter.key}
          value={filter.key}
          className="border-none py-0"
        >
          <AccordionTrigger
            className={cn(
              "rounded-md px-2 py-2 text-sm font-semibold text-neutral-600 sm:text-sm",
              "hover:bg-bg-subtle hover:no-underline",
              "[&>svg]:size-4 [&>svg]:text-neutral-400",
            )}
          >
            {filter.label}
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            {filter.options === null ? (
              <FilterOptionRowsSkeleton />
            ) : filter.options.length === 0 ? (
              <p className="px-2 py-2 text-sm text-neutral-400">No options</p>
            ) : (
              <div className="flex flex-col gap-1">
                {filter.options.map((option) => (
                  <FilterOptionRow
                    key={String(option.value)}
                    filter={filter}
                    option={option}
                    checked={isOptionSelected(filter.key, option.value)}
                    onToggle={() => toggleOption(filter, option.value)}
                    className={optionClassName}
                  />
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function valuesMatch(a: FilterOption["value"], b: FilterOption["value"]) {
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }

  return a === b;
}
