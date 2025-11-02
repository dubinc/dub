import { cn, truncate } from "@dub/utils";
import { Command } from "cmdk";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ReactNode, isValidElement, useState } from "react";
import { AnimatedSizeContainer } from "../animated-size-container";
import { Combobox, ComboboxOption } from "../combobox";
import { useKeyboardShortcut } from "../hooks";
import { Icon } from "../icons";
import { Filter, FilterOption } from "./types";

type FilterListProps = {
  filters: Filter[];
  activeFilters?: {
    key: Filter["key"];
    value: FilterOption["value"];
  }[];
  onRemove: (key: string, value: FilterOption["value"]) => void;
  onRemoveAll: () => void;
  onSelect?: (key: string, value: FilterOption["value"]) => void;
  className?: string;
};

export function FilterList({
  filters,
  activeFilters,
  onRemove,
  onRemoveAll,
  onSelect,
  className,
}: FilterListProps) {
  useKeyboardShortcut("Escape", onRemoveAll, { priority: 1 });
  return (
    <AnimatedSizeContainer
      height
      className="w-full"
      transition={{ type: "tween", duration: 0.3 }}
    >
      <div
        className={cn(
          "flex w-full flex-wrap items-start gap-4 sm:flex-nowrap",
          className,
        )}
      >
        <div className="flex grow flex-wrap gap-x-4 gap-y-2">
          <AnimatePresence>
            {activeFilters?.map(({ key, value: filterValue }) => {
              if (key === "loader") {
                return (
                  <motion.div
                    key={`loader-${filterValue}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-9 w-48 animate-pulse rounded-md border border-neutral-200 bg-white"
                  />
                );
              }

              const filter = filters.find((f) => f.key === key);
              if (!filter) {
                console.error(
                  "Filter.List received an activeFilter without a corresponding filter",
                );
                return null;
              }

              return (
                filter.multiple && Array.isArray(filterValue)
                  ? filterValue
                  : [filterValue]
              ).map((value) => {
                const option = filter.options?.find((o) =>
                  typeof o.value === "string" && typeof value === "string"
                    ? o.value.toLowerCase() === value.toLowerCase()
                    : o.value === value,
                );

                const OptionIcon =
                  option?.icon ??
                  filter.getOptionIcon?.(value, {
                    key: filter.key,
                    option,
                  }) ??
                  filter.icon;

                const optionLabel =
                  option?.label ??
                  filter.getOptionLabel?.(value, { key: filter.key, option }) ??
                  value;

                const optionPermalink =
                  option?.permalink ??
                  filter.getOptionPermalink?.(value) ??
                  null;

                const OptionDisplay = ({
                  className,
                }: {
                  className?: string;
                }) => (
                  <div
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2",
                      className,
                    )}
                  >
                    <span className="shrink-0 text-neutral-600">
                      {isReactNode(OptionIcon) ? (
                        OptionIcon
                      ) : (
                        <OptionIcon className="h-4 w-4" />
                      )}
                    </span>
                    {optionPermalink ? (
                      <Link
                        href={optionPermalink}
                        target="_blank"
                        className="cursor-alias decoration-dotted underline-offset-2 hover:underline"
                      >
                        {truncate(optionLabel, 30)}
                      </Link>
                    ) : (
                      truncate(optionLabel, 30)
                    )}
                  </div>
                );

                return (
                  <motion.div
                    key={`${key}-${value}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center divide-x rounded-md border border-neutral-200 bg-white text-sm text-black"
                  >
                    {/* Filter */}
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      <span className="shrink-0 text-neutral-600">
                        {isReactNode(filter.icon) ? (
                          filter.icon
                        ) : (
                          <filter.icon className="h-4 w-4" />
                        )}
                      </span>
                      {filter.label}
                    </div>

                    {/* is */}
                    <div className="px-3 py-2 text-neutral-500">is</div>

                    {/* Option */}
                    <div className="flex items-center">
                      {!filter.options ? (
                        <div className="flex items-center gap-2.5 px-3 py-2">
                          <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
                        </div>
                      ) : // show the filter list item dropdown if there's onSelect configured
                      // and the filter is not hidden in the main filter dropdown itself
                      onSelect && !filter.hideInFilterDropdown ? (
                        (() => {
                          // Precompute options array once
                          const options: ComboboxOption[] =
                            filter.options?.map((opt): ComboboxOption => {
                              const optionIcon =
                                opt.icon ??
                                filter.getOptionIcon?.(opt.value, {
                                  key: filter.key,
                                  option: opt,
                                }) ??
                                filter.icon;

                              return {
                                label:
                                  opt.label ??
                                  filter.getOptionLabel?.(opt.value, {
                                    key: filter.key,
                                    option: opt,
                                  }) ??
                                  String(opt.value),
                                value: String(opt.value),
                                icon: optionIcon,
                              };
                            }) ?? [];

                          // Find selected option from precomputed array
                          const selectedOption = options.find((opt) =>
                            typeof opt.value === "string" &&
                            typeof value === "string"
                              ? opt.value.toLowerCase() ===
                                String(value).toLowerCase()
                              : opt.value === String(value),
                          );

                          return (
                            <FilterCombobox
                              key={`${key}-${value}`}
                              filter={filter}
                              value={value}
                              filterKey={key}
                              options={options}
                              selectedOption={selectedOption}
                              onRemove={onRemove}
                              onSelect={onSelect}
                              OptionDisplay={OptionDisplay}
                              optionLabel={optionLabel}
                            />
                          );
                        })()
                      ) : (
                        OptionDisplay({})
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      className="h-full rounded-r-md p-2 text-neutral-500 ring-inset ring-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus-visible:ring-1"
                      onClick={() => onRemove(key, value)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              });
            })}
          </AnimatePresence>
        </div>
        {activeFilters?.length !== 0 && (
          <button
            type="button"
            className="group mt-px flex items-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-sm text-neutral-500 ring-inset ring-neutral-500 transition-colors hover:border-neutral-200 hover:bg-white hover:text-black focus:outline-none"
            onClick={onRemoveAll}
          >
            Clear Filters
            <kbd className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-950 group-hover:bg-neutral-50">
              ESC
            </kbd>
          </button>
        )}
      </div>
    </AnimatedSizeContainer>
  );
}

function FilterCombobox({
  filter,
  value,
  filterKey,
  options,
  selectedOption,
  onRemove,
  onSelect,
  OptionDisplay,
  optionLabel,
}: {
  filter: Filter;
  value: FilterOption["value"];
  filterKey: string;
  options: ComboboxOption[];
  selectedOption: ComboboxOption | undefined;
  onRemove: (key: string, value: FilterOption["value"]) => void;
  onSelect: (key: string, value: FilterOption["value"]) => void;
  OptionDisplay: ({ className }: { className?: string }) => ReactNode;
  optionLabel: string;
}) {
  const [search, setSearch] = useState("");

  // Check if filter has empty options array
  const hasEmptyOptions = filter.options && filter.options.length === 0;

  // Create emptyState based on CommandEmpty logic
  const emptyState = (() => {
    // If the filter has no options, show the search input as an option or "Start typing to search..."
    if (hasEmptyOptions) {
      if (!search) {
        return (
          <Command.Empty className="p-2 text-center text-sm text-neutral-400">
            Start typing to search...
          </Command.Empty>
        );
      }
      // When search exists and filter has empty options, the onCreate handler will show the create option
      return null; // onCreate will handle showing the option
    }

    return (
      <Command.Empty className="p-2 text-center text-sm text-neutral-400">
        No matching options
      </Command.Empty>
    );
  })();

  return (
    <Combobox
      selected={selectedOption ?? null}
      setSelected={(newOption: ComboboxOption | null) => {
        if (newOption && newOption.value !== String(value)) {
          // Remove the current value and add the new one
          onRemove(filterKey, value);
          onSelect(filterKey, newOption.value);
        }
      }}
      options={options}
      onSearchChange={setSearch}
      onCreate={
        hasEmptyOptions && onSelect
          ? async (searchValue: string) => {
              // Select the search value as a new option
              onRemove(filterKey, value);
              onSelect(filterKey, searchValue);
              return true;
            }
          : undefined
      }
      createLabel={hasEmptyOptions ? (searchValue) => searchValue : undefined}
      createIcon={filter.icon as Icon}
      optionRight={(option) => {
        if (option.value === String(value)) {
          return;
        }
        const filterOption = filter.options?.find((opt) =>
          typeof String(opt.value) === "string" &&
          typeof option.value === "string"
            ? String(opt.value).toLowerCase() === option.value.toLowerCase()
            : String(opt.value) === option.value,
        );
        return filterOption ? (
          <span className="ml-2 text-neutral-500">{filterOption.right}</span>
        ) : null;
      }}
      placeholder={truncate(optionLabel, 30)}
      caret={false}
      emptyState={emptyState}
      trigger={OptionDisplay({
        className: "cursor-pointer hover:bg-neutral-50",
      })}
    />
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
