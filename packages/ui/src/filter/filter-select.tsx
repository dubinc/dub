import { cn, truncate } from "@dub/utils";
import { Command, useCommandState } from "cmdk";
import { ChevronDown, ListFilter } from "lucide-react";
import {
  Fragment,
  PropsWithChildren,
  ReactNode,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatedSizeContainer } from "../animated-size-container";
import { useKeyboardShortcut, useMediaQuery } from "../hooks";
import { Check, LoadingSpinner, Magic } from "../icons";
import { Popover } from "../popover";
import { FilterRangePanel } from "./filter-range-panel";
import { FilterScroll } from "./filter-scroll";
import {
  ActiveFilterInput,
  Filter,
  FilterOption,
  normalizeActiveFilter,
  parseRangeToken,
} from "./types";

type FilterSelectProps = {
  filters: Filter[];
  onSelect: (
    key: string,
    value: FilterOption["value"] | FilterOption["value"][],
  ) => void;
  onRemove: (key: string, value: FilterOption["value"]) => void;
  /** Clears an entire filter (e.g. numeric range with two URL params). */
  onRemoveFilter?: (key: string) => void;
  onOpenFilter?: (key: string) => void;
  onSearchChange?: (search: string) => void;
  onSelectedFilterChange?: (key: string | null) => void;
  activeFilters?: ActiveFilterInput[];
  askAI?: boolean;
  isAdvancedFilter?: boolean;
  children?: ReactNode;
  emptyState?: ReactNode | Record<string, ReactNode>;
  className?: string;
};

export function FilterSelect({
  filters,
  onSelect,
  onRemove,
  onRemoveFilter,
  onOpenFilter,
  onSearchChange,
  onSelectedFilterChange,
  activeFilters,
  askAI,
  isAdvancedFilter = false,
  children,
  emptyState,
  className,
}: FilterSelectProps) {
  const { isMobile } = useMediaQuery();

  // Track main list container/dimensions to maintain size for loading spinner
  const listContainer = useRef<HTMLDivElement>(null);
  const listDimensions = useRef<{
    width: number;
    height: number;
  }>(undefined);

  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcut("f", () => setIsOpen(true), {
    enabled: !isOpen,
  });

  const [search, setSearch] = useState("");
  const [selectedFilterKey, setSelectedFilterKey] = useState<
    Filter["key"] | null
  >(null);

  const reset = useCallback(() => {
    setSearch("");
    setSelectedFilterKey(null);
  }, []);

  const goBackOrClose = useCallback(() => {
    selectedFilterKey ? reset() : setIsOpen(false);
  }, [selectedFilterKey, reset]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  // The currently selected filter to display options for
  const selectedFilter = selectedFilterKey
    ? filters.find(({ key }) => key === selectedFilterKey)
    : null;

  const activeRangeTokenForSelected = useMemo(() => {
    if (!selectedFilter || selectedFilter.type !== "range" || !activeFilters) {
      return undefined;
    }
    const raw = activeFilters.find((f) => f.key === selectedFilter.key);
    if (!raw) {
      return undefined;
    }
    return normalizeActiveFilter(raw).values[0] as string | undefined;
  }, [activeFilters, selectedFilter]);

  const rangeFilterHasAppliedValue = useMemo(() => {
    if (!selectedFilter || selectedFilter.type !== "range") {
      return false;
    }
    const { min, max } = parseRangeToken(activeRangeTokenForSelected);
    return min != null || max != null;
  }, [selectedFilter, activeRangeTokenForSelected]);

  const openFilter = useCallback(
    (key: Filter["key"]) => {
      // Maintain dimensions for loading options
      if (listContainer.current) {
        listDimensions.current = {
          width: listContainer.current.clientWidth,
          height: listContainer.current.clientHeight,
        };
      }

      setSearch("");
      setSelectedFilterKey(key);

      onOpenFilter?.(key);
    },
    [onOpenFilter],
  );

  const isOptionSelected = useCallback(
    (value: FilterOption["value"]) => {
      if (!selectedFilter || !activeFilters) return false;

      const rawActiveFilter = activeFilters.find(
        (filter) => filter.key === selectedFilterKey,
      );
      if (!rawActiveFilter) return false;

      const normalizedFilter = normalizeActiveFilter(rawActiveFilter);
      return normalizedFilter.values.includes(value);
    },
    [selectedFilter, activeFilters, selectedFilterKey],
  );

  const selectOption = useCallback(
    (value: FilterOption["value"]) => {
      if (selectedFilter) {
        const isSingleSelect =
          selectedFilter?.singleSelect ||
          (!isAdvancedFilter && !selectedFilter?.multiple);

        if (isSingleSelect) {
          const isSelected = isOptionSelected(value);
          isSelected
            ? onRemove(selectedFilter.key, value)
            : onSelect(selectedFilter.key, value);
          setIsOpen(false);
        } else {
          const isSelected = isOptionSelected(value);
          if (isSelected) {
            onRemove(selectedFilter.key, value);
          } else {
            onSelect(selectedFilter.key, value);
          }
        }
      }
    },
    [selectedFilter, isOptionSelected, onSelect, onRemove, isAdvancedFilter],
  );

  useEffect(() => {
    onSearchChange?.(search);
  }, [search]);

  useEffect(() => {
    onSelectedFilterChange?.(selectedFilterKey);
  }, [selectedFilterKey]);

  // If filter is selected and has options, maintain dimensions (for async fetches)
  useEffect(() => {
    if (selectedFilter?.options && listContainer.current) {
      listDimensions.current = {
        width: listContainer.current.clientWidth,
        height: listContainer.current.clientHeight,
      };
    }
  }, [selectedFilter?.options]);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      onEscapeKeyDown={(e) => {
        if (selectedFilter?.type === "range") {
          const { min, max } = parseRangeToken(activeRangeTokenForSelected);
          if (min != null && max != null) {
            e.preventDefault();
            setIsOpen(false);
            return;
          }
        }
        if (selectedFilterKey) {
          e.preventDefault();
          e.stopPropagation();
          goBackOrClose();
          return;
        }
        e.preventDefault();
        setIsOpen(false);
      }}
      content={
        <AnimatedSizeContainer
          width={!isMobile}
          height
          className="rounded-[inherit]"
          style={{ transform: "translateZ(0)" }} // Fixes overflow on some browsers
        >
          {selectedFilter?.type === "range" ? (
            <FilterRangePanel
              key={selectedFilterKey}
              filter={selectedFilter}
              activeToken={activeRangeTokenForSelected}
              scrollRef={listContainer}
              onBack={() => reset()}
              onClear={
                rangeFilterHasAppliedValue && selectedFilterKey
                  ? () =>
                      onRemoveFilter
                        ? onRemoveFilter(selectedFilterKey)
                        : onRemove(
                            selectedFilterKey,
                            activeRangeTokenForSelected ?? "|",
                          )
                  : undefined
              }
              onCloseOuter={() => setIsOpen(false)}
              onApply={(token) => {
                if (token === "|") {
                  onRemoveFilter
                    ? onRemoveFilter(selectedFilter.key)
                    : onRemove(
                        selectedFilter.key,
                        activeRangeTokenForSelected ?? "|",
                      );
                } else {
                  onSelect(selectedFilter.key, token);
                }
              }}
            />
          ) : (
            <Command
              loop
              shouldFilter={
                !selectedFilter || selectedFilter.shouldFilter !== false
              }
            >
              <div className="flex items-center overflow-hidden rounded-t-lg border-b border-neutral-200">
                <CommandInput
                  placeholder={`${selectedFilter?.label || "Filter"}...`}
                  value={search}
                  onValueChange={setSearch}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Escape" ||
                      ((e.key === "Backspace" || e.key === "Delete") && !search)
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      goBackOrClose();
                    }
                  }}
                  onEmptySubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (askAI) {
                      onSelect(
                        "ai",
                        // Prepend search with selected filter label for more context
                        selectedFilter
                          ? `${selectedFilter.label} ${search}`
                          : search,
                      );
                      setIsOpen(false);
                    } else selectOption(search);
                  }}
                />
                {!selectedFilter && (
                  <kbd className="mr-2 hidden shrink-0 rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-light text-neutral-500 md:block">
                    F
                  </kbd>
                )}
              </div>
              <FilterScroll key={selectedFilterKey} ref={listContainer}>
                <Command.List
                  className={cn(
                    "flex w-full flex-col gap-1 p-1",
                    selectedFilter ? "min-w-[100px]" : "min-w-[180px]",
                  )}
                >
                  {!selectedFilter
                    ? // Top-level filters
                      filters
                        .filter((filter) => !filter.hideInFilterDropdown)
                        .map((filter) => (
                          <Fragment key={filter.key}>
                            <FilterButton
                              filter={filter}
                              onSelect={() => openFilter(filter.key)}
                            />
                            {filter.separatorAfter && (
                              <Command.Separator className="-mx-1 my-1 border-b border-neutral-200" />
                            )}
                          </Fragment>
                        ))
                    : // Filter options
                      selectedFilter.options
                        ?.filter(
                          (option) => !search || !option.hideDuringSearch,
                        )
                        ?.map((option) => {
                          const isSingleSelect =
                            selectedFilter?.singleSelect ||
                            (!isAdvancedFilter && !selectedFilter?.multiple);
                          const isSelected = isOptionSelected(option.value);

                          return (
                            <FilterButton
                              key={option.value}
                              filter={selectedFilter}
                              option={option}
                              showCheckbox={
                                !isSingleSelect &&
                                (isAdvancedFilter || selectedFilter?.multiple)
                              }
                              isChecked={isSelected}
                              right={
                                isSingleSelect ? (
                                  isSelected ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    option.right
                                  )
                                ) : (
                                  option.right
                                )
                              }
                              onSelect={() => selectOption(option.value)}
                            />
                          );
                        }) ?? (
                        // Filter options loading state
                        <Command.Loading>
                          <div
                            className="-m-1 flex items-center justify-center"
                            style={listDimensions.current}
                          >
                            <LoadingSpinner />
                          </div>
                        </Command.Loading>
                      )}

                  {/* Only render CommandEmpty if not loading */}
                  {(!selectedFilter || selectedFilter.options) && (
                    <CommandEmpty
                      search={search}
                      selectedFilter={selectedFilter}
                      onSelect={() => selectOption(search)}
                      askAI={askAI}
                    >
                      {emptyState
                        ? isEmptyStateObject(emptyState)
                          ? emptyState?.[selectedFilterKey ?? "default"] ??
                            "No matching options"
                          : emptyState
                        : "No matching options"}
                    </CommandEmpty>
                  )}
                </Command.List>
              </FilterScroll>
            </Command>
          )}
        </AnimatedSizeContainer>
      }
    >
      <button
        type="button"
        className={cn(
          "group flex h-10 cursor-pointer appearance-none items-center gap-x-2 truncate rounded-lg border px-3 text-sm outline-none",
          "transition-[color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
          "border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400",
          "focus-visible:border-neutral-500 data-[state=open]:border-neutral-500 data-[state=open]:ring-4 data-[state=open]:ring-neutral-200",
          "active:scale-[0.98] motion-reduce:active:scale-100",
          className,
        )}
      >
        <ListFilter className="size-4 shrink-0" />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-neutral-900">
          {children ?? "Filter"}
        </span>
        {activeFilters?.length ? (
          <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-black text-[0.625rem] text-white">
            {activeFilters.length}
          </div>
        ) : (
          <ChevronDown
            className={`size-4 shrink-0 text-neutral-400 transition-transform duration-100 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none`}
          />
        )}
      </button>
    </Popover>
  );
}

function isEmptyStateObject(
  emptyState: ReactNode | Record<string, ReactNode>,
): emptyState is Record<string, ReactNode> {
  return (
    typeof emptyState === "object" &&
    emptyState !== null &&
    !isValidElement(emptyState)
  );
}

const CommandInput = (
  props: React.ComponentProps<typeof Command.Input> & {
    onEmptySubmit?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  },
) => {
  const { onEmptySubmit, ...restProps } = props;
  const isEmpty = useCommandState((state) => state.filtered.count === 0);
  return (
    <Command.Input
      {...restProps}
      size={1}
      className="grow border-0 py-3 pl-4 pr-2 outline-none placeholder:text-neutral-400 focus:ring-0 sm:text-sm"
      onKeyDown={(e) => {
        props.onKeyDown?.(e);

        if (e.key === "Enter" && isEmpty) {
          onEmptySubmit?.(e);
        }
      }}
      autoCapitalize="none"
    />
  );
};

function FilterButton({
  filter,
  option,
  right,
  showCheckbox,
  isChecked,
  onSelect,
}: {
  filter: Filter;
  option?: FilterOption;
  right?: ReactNode;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onSelect: () => void;
}) {
  const Icon = option
    ? option.icon ??
      filter.getOptionIcon?.(option.value, { key: filter.key, option }) ??
      filter.icon
    : filter.icon;

  const label = option
    ? option.label ??
      filter.getOptionLabel?.(option.value, { key: filter.key, option })
    : filter.label;

  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm",
        "transition-colors duration-100 ease-out motion-reduce:transition-none",
        "active:scale-[0.99] motion-reduce:active:scale-100",
        "data-[selected=true]:bg-neutral-100",
      )}
      value={label + option?.value}
      onSelect={onSelect}
      onMouseDown={(e) => {
        // Keep the search input focused when selecting with mouse
        e.preventDefault();
      }}
    >
      {showCheckbox && (
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border",
            isChecked
              ? "border-neutral-900 bg-neutral-900"
              : "border-neutral-300",
          )}
        >
          {isChecked && <Check className="h-3 w-3 text-white" />}
        </div>
      )}
      <span className="shrink-0 text-neutral-600">
        {isReactNode(Icon) ? Icon : <Icon className="h-4 w-4" />}
      </span>
      <span className="flex-1">{truncate(label, 48)}</span>
      <div className="ml-1 flex shrink-0 justify-end text-neutral-500">
        {right}
      </div>
    </Command.Item>
  );
}

const CommandEmpty = ({
  search,
  selectedFilter,
  onSelect,
  askAI,
  children,
}: PropsWithChildren<{
  search: string;
  selectedFilter?: Filter | null;
  onSelect: () => void;
  askAI?: boolean;
}>) => {
  // If the selected filter has no options (and shouldFilter is true,
  // meaning it's leveraging Command.List's native filtering and not external/async filtering),
  // show the search input as an option
  if (
    selectedFilter &&
    selectedFilter.options &&
    selectedFilter.options.length === 0 &&
    selectedFilter.shouldFilter !== false
  ) {
    if (!search)
      return (
        <Command.Empty className="p-2 text-center text-sm text-neutral-400">
          Start typing to search...
        </Command.Empty>
      );

    return (
      <FilterButton
        filter={selectedFilter}
        option={{
          value: search,
          label: search,
        }}
        onSelect={onSelect}
      />
    );
  }

  // Ask AI option should only be shown if no filter is selected and the user has typed something in the search input
  if (!selectedFilter && askAI && search) {
    return (
      <Command.Empty className="flex min-w-[180px] items-center space-x-2 rounded-md bg-neutral-100 px-3 py-2">
        <Magic className="h-4 w-4" />
        <p className="text-center text-sm text-neutral-600">
          Ask AI <span className="text-black">"{search}"</span>
        </p>
      </Command.Empty>
    );
  }

  return (
    <Command.Empty className="p-2 text-center text-sm text-neutral-400">
      {children}
    </Command.Empty>
  );
};

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
