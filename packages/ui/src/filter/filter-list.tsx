import { cn, pluralize, truncate } from "@dub/utils";
import { Command } from "cmdk";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ReactNode, isValidElement, useCallback, useState } from "react";
import { AnimatedSizeContainer } from "../animated-size-container";
import { useKeyboardShortcut } from "../hooks";
import { Check } from "../icons";
import { Popover } from "../popover";
import {
  ActiveFilterInput,
  Filter,
  FilterOperator,
  FilterOption,
  normalizeActiveFilter,
} from "./types";

type FilterListProps = {
  filters: Filter[];
  activeFilters?: ActiveFilterInput[];
  onRemove: (key: string, value: FilterOption["value"]) => void;
  onRemoveFilter?: (key: string) => void;
  onRemoveAll: () => void;
  onSelect?: (
    key: string,
    value: FilterOption["value"] | FilterOption["value"][],
  ) => void;
  onToggleOperator?: (key: string) => void;
  isAdvancedFilter?: boolean;
  className?: string;
};

function getOperatorLabel(operator: FilterOperator): string {
  switch (operator) {
    case "IS":
    case "IS_ONE_OF":
      return "is";

    case "IS_NOT":
    case "IS_NOT_ONE_OF":
      return "is not";

    default:
      return "is";
  }
}

export function FilterList({
  filters,
  activeFilters,
  onRemove,
  onRemoveFilter,
  onRemoveAll,
  onSelect,
  onToggleOperator,
  isAdvancedFilter = false,
  className,
}: FilterListProps) {
  useKeyboardShortcut("Escape", onRemoveAll, { priority: 1 });
  const normalizedFilters = activeFilters?.map(normalizeActiveFilter) ?? [];

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
            {normalizedFilters.map(({ key, values, operator }) => {
              if (key === "loader") {
                return (
                  <motion.div
                    key={`loader-${values?.[0] ?? 0}`}
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

              const isSingleValue = values.length === 1;
              const displayValues = values.slice(0, 3);

              const displayLabel = isSingleValue
                ? (() => {
                    const value = values[0];
                    const option = filter.options?.find((o) =>
                      typeof o.value === "string" && typeof value === "string"
                        ? o.value.toLowerCase() === value.toLowerCase()
                        : o.value === value,
                    );
                    return (
                      option?.label ??
                      filter.getOptionLabel?.(value, {
                        key: filter.key,
                        option,
                      }) ??
                      String(value)
                    );
                  })()
                : `${values.length} ${filter.labelPlural ?? pluralize(filter.label, values.length)}`;

              const OptionDisplay = ({ className }: { className?: string }) => {
                let iconDisplay;
                let permalinkDisplay;

                if (isSingleValue) {
                  const value = values[0];
                  const option = filter.options?.find((o) =>
                    typeof o.value === "string" && typeof value === "string"
                      ? o.value.toLowerCase() === value.toLowerCase()
                      : o.value === value,
                  );

                  permalinkDisplay =
                    option?.permalink ??
                    filter.getOptionPermalink?.(value) ??
                    null;

                  const OptionIcon =
                    option?.icon ??
                    filter.getOptionIcon?.(value, {
                      key: filter.key,
                      option,
                    }) ??
                    filter.icon;

                  iconDisplay = (
                    <span className="shrink-0 text-neutral-600">
                      {isReactNode(OptionIcon) ? (
                        OptionIcon
                      ) : (
                        <OptionIcon className="h-4 w-4" />
                      )}
                    </span>
                  );
                } else if (!filter.hideMultipleIcons) {
                  iconDisplay = (
                    <div className="flex shrink-0 -space-x-1">
                      {displayValues.map((value, idx) => {
                        const option = filter.options?.find((o) =>
                          typeof o.value === "string" &&
                          typeof value === "string"
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

                        return (
                          <span
                            key={idx}
                            className="inline-flex text-neutral-600"
                            style={{ zIndex: displayValues.length - idx }}
                          >
                            {isReactNode(OptionIcon) ? (
                              OptionIcon
                            ) : (
                              <OptionIcon className="h-4 w-4" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  );
                } else {
                  iconDisplay = (
                    <span className="shrink-0 text-neutral-600">
                      {isReactNode(filter.icon) ? (
                        filter.icon
                      ) : (
                        <filter.icon className="h-4 w-4" />
                      )}
                    </span>
                  );
                }

                return (
                  <div
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2",
                      className,
                    )}
                  >
                    {iconDisplay}
                    {permalinkDisplay ? (
                      <Link
                        href={permalinkDisplay}
                        target="_blank"
                        className="cursor-alias decoration-dotted underline-offset-2 hover:underline"
                      >
                        {truncate(displayLabel, 30)}
                      </Link>
                    ) : (
                      truncate(displayLabel, 30)
                    )}
                  </div>
                );
              };

              return (
                <OperatorFilterPill
                  key={key}
                  filterKey={key}
                  filter={filter}
                  values={values}
                  operator={operator}
                  OptionDisplay={OptionDisplay}
                  onRemove={onRemove}
                  onRemoveFilter={onRemoveFilter}
                  onSelect={onSelect}
                  onToggleOperator={onToggleOperator}
                  isAdvancedFilter={isAdvancedFilter}
                />
              );
            })}
          </AnimatePresence>
        </div>
        {normalizedFilters.length !== 0 && (
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

function OperatorFilterPill({
  filterKey,
  filter,
  values,
  operator,
  OptionDisplay,
  onRemove,
  onRemoveFilter,
  onSelect,
  onToggleOperator,
  isAdvancedFilter = false,
}: {
  filterKey: string;
  filter: Filter;
  values: FilterOption["value"][];
  operator: FilterOperator;
  OptionDisplay: ({ className }: { className?: string }) => ReactNode;
  onRemove: (key: string, value: FilterOption["value"]) => void;
  onRemoveFilter?: (key: string) => void;
  onSelect?: (
    key: string,
    value: FilterOption["value"] | FilterOption["value"][],
  ) => void;
  onToggleOperator?: (key: string) => void;
  isAdvancedFilter?: boolean;
}) {
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);
  const [valueDropdownOpen, setValueDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [initialSelectedValues, setInitialSelectedValues] = useState<
    Set<FilterOption["value"]>
  >(new Set());

  const openValueDropdown = useCallback(() => {
    setInitialSelectedValues(new Set(values));
    setValueDropdownOpen(true);
  }, [values]);

  const toggleValue = useCallback(
    (value: FilterOption["value"]) => {
      const isSelected = values.includes(value);
      if (isSelected) {
        onRemove(filterKey, value);
      } else {
        onSelect?.(filterKey, value);
      }

      if (!isAdvancedFilter && !filter.multiple) setValueDropdownOpen(false);
    },
    [filterKey, values, onSelect, onRemove, isAdvancedFilter, filter.multiple],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center divide-x rounded-md border border-neutral-200 bg-white text-sm text-black"
    >
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

      {(isAdvancedFilter || filter.multiple) &&
      !filter.singleSelect &&
      !filter.hideOperator ? (
        <Popover
          openPopover={operatorDropdownOpen}
          setOpenPopover={setOperatorDropdownOpen}
          content={
            <div className="w-32 p-1">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100",
                  !operator.includes("NOT") && "bg-neutral-50",
                )}
                onClick={() => {
                  if (operator.includes("NOT")) {
                    onToggleOperator?.(filterKey);
                  }
                  setOperatorDropdownOpen(false);
                }}
              >
                is
              </button>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100",
                  operator.includes("NOT") && "bg-neutral-50",
                )}
                onClick={() => {
                  if (!operator.includes("NOT")) {
                    onToggleOperator?.(filterKey);
                  }
                  setOperatorDropdownOpen(false);
                }}
              >
                is not
              </button>
            </div>
          }
          align="center"
        >
          <button
            type="button"
            className="px-3 py-2 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
          >
            {getOperatorLabel(operator)}
          </button>
        </Popover>
      ) : (
        <div className="px-3 py-2 text-neutral-500">is</div>
      )}

      <Popover
        openPopover={valueDropdownOpen}
        setOpenPopover={(open) => {
          setValueDropdownOpen(open);
          if (!open) {
            setSearch("");
            setInitialSelectedValues(new Set());
          }
        }}
        content={
          <div>
            <AnimatedSizeContainer width height className="rounded-[inherit]">
              <Command loop shouldFilter={false}>
                <div className="flex items-center overflow-hidden rounded-t-lg border-b border-neutral-200">
                  <Command.Input
                    placeholder={`${filter.label}...`}
                    value={search}
                    onValueChange={setSearch}
                    className="grow border-0 py-3 pl-4 pr-2 outline-none placeholder:text-neutral-400 focus:ring-0 sm:text-sm"
                    autoCapitalize="none"
                  />
                </div>
                <div className="scrollbar-hide max-h-[50vh] w-screen overflow-y-scroll sm:w-auto">
                  <Command.List className="flex w-full min-w-[180px] flex-col gap-1 p-1">
                    {(() => {
                      const filteredOptions =
                        filter.options?.filter((option) => {
                          if (!search) return true;
                          const optionLabel = (
                            option.label ??
                            filter.getOptionLabel?.(option.value, {
                              key: filter.key,
                              option,
                            }) ??
                            String(option.value)
                          ).toLowerCase();
                          return optionLabel.includes(search.toLowerCase());
                        }) ?? [];

                      const selectedOptions = filteredOptions.filter((option) =>
                        initialSelectedValues.has(option.value),
                      );
                      const unselectedOptions = filteredOptions.filter(
                        (option) => !initialSelectedValues.has(option.value),
                      );

                      const renderOption = (option: FilterOption) => {
                        const isSelected = values.includes(option.value);
                        const OptionIcon =
                          option.icon ??
                          filter.getOptionIcon?.(option.value, {
                            key: filter.key,
                            option,
                          }) ??
                          filter.icon;

                        const optionLabel =
                          option.label ??
                          filter.getOptionLabel?.(option.value, {
                            key: filter.key,
                            option,
                          }) ??
                          String(option.value);

                        return (
                          <Command.Item
                            key={option.value}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm",
                              "data-[selected=true]:bg-neutral-100",
                            )}
                            onSelect={() => {
                              toggleValue(option.value);
                            }}
                            onPointerDown={(e) => {
                              e.preventDefault();
                            }}
                            value={optionLabel + option.value}
                          >
                            {(isAdvancedFilter || filter.multiple) &&
                              !filter.singleSelect && (
                                <div
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded border",
                                    isSelected
                                      ? "border-neutral-900 bg-neutral-900"
                                      : "border-neutral-300",
                                  )}
                                >
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              )}
                            <span className="shrink-0 text-neutral-600">
                              {isReactNode(OptionIcon) ? (
                                OptionIcon
                              ) : (
                                <OptionIcon className="h-4 w-4" />
                              )}
                            </span>
                            <span className="flex-1">
                              {truncate(optionLabel, 48)}
                            </span>
                            <div className="ml-1 flex shrink-0 justify-end text-neutral-500">
                              {(isAdvancedFilter || filter.multiple) &&
                              !filter.singleSelect ? (
                                option.right
                              ) : isSelected ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                option.right
                              )}
                            </div>
                          </Command.Item>
                        );
                      };

                      return (
                        <>
                          {selectedOptions.map(renderOption)}

                          {(isAdvancedFilter || filter.multiple) &&
                            !filter.singleSelect &&
                            selectedOptions.length > 0 &&
                            unselectedOptions.length > 0 && (
                              <Command.Separator className="-mx-1 my-1 border-b border-neutral-200" />
                            )}

                          {unselectedOptions.map(renderOption)}
                        </>
                      );
                    })()}
                  </Command.List>
                </div>
              </Command>
            </AnimatedSizeContainer>
          </div>
        }
        align="start"
      >
        <button
          type="button"
          onClick={openValueDropdown}
          disabled={filter.options?.length === 0}
          className={cn(
            "flex items-center",
            filter.options?.length && "transition-colors hover:bg-neutral-50",
          )}
        >
          {!filter.options ? (
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
            </div>
          ) : (
            OptionDisplay({ className: "cursor-pointer" })
          )}
        </button>
      </Popover>

      <button
        type="button"
        className="h-full rounded-r-md p-2 text-neutral-500 ring-inset ring-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus-visible:ring-1"
        onClick={() => {
          if (onRemoveFilter) {
            onRemoveFilter(filterKey);
          } else {
            values.forEach((value) => {
              onRemove(filterKey, value);
            });
          }
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
