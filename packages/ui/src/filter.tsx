import { cn } from "@dub/utils";
import { Check, ChevronDown, ListFilter, LucideIcon } from "lucide-react";
import {
  ReactNode,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatedSizeContainer } from "./animated-size-container";
import { LoadingSpinner } from "./icons";
import { Popover } from "./popover";

type Filter = {
  key: string;
  icon: LucideIcon | ReactNode;
  label: string;
  options: FilterOption[] | null;
};

type FilterOption = {
  value: any;
  icon: LucideIcon | ReactNode;
  label: string;
  right?: ReactNode;
};

type FilterProps = {
  filters: Filter[];
  onSelect: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  activeFilters?: {
    key: Filter["key"];
    value: FilterOption["value"];
  }[];
  children?: ReactNode;
  className?: string;
};

function Select({
  filters,
  onSelect,
  onRemove,
  activeFilters,
  children,
  className,
}: FilterProps) {
  // Track main list container/dimensions to maintain size for loading spinner
  const mainListContainer = useRef<HTMLDivElement>(null);
  const mainListDimensions = useRef<{
    width: number;
    height: number;
  }>();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFilterKey, setSelectedFilterKey] = useState<
    Filter["key"] | null
  >(null);

  const reset = useCallback(() => {
    setSearch("");
    setSelectedFilterKey(null);
  }, []);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  // The currently selected filter to display options for
  const selectedFilter = selectedFilterKey
    ? filters.find(({ key }) => key === selectedFilterKey)
    : null;

  const openFilter = useCallback((key: Filter["key"]) => {
    if (mainListContainer.current) {
      mainListDimensions.current = {
        width: mainListContainer.current.scrollWidth,
        height: mainListContainer.current.scrollHeight,
      };
    }

    setSearch("");
    setSelectedFilterKey(key);
  }, []);

  const selectOption = useCallback(
    (value: FilterOption["value"]) => {
      if (!selectedFilter) return;

      activeFilters?.find(({ key }) => key === selectedFilterKey)?.value ===
      value
        ? onRemove(selectedFilter.key)
        : onSelect(selectedFilter.key, value);

      setIsOpen(false);
    },
    [activeFilters, selectedFilter],
  );

  // Filters with options that match the search
  const filteredFilters = useMemo(
    () =>
      filters.filter(
        ({ label, options }) =>
          (!search || label.toLowerCase().includes(search.toLowerCase())) &&
          options?.length !== 0,
      ),
    [filters, search],
  );

  // The currently highlighted filter that will be selected on enter press
  const highlightedFilterKey = useMemo(
    () =>
      !selectedFilterKey && search.length > 0 && filteredFilters.length
        ? filteredFilters[0].key
        : null,
    [search, filteredFilters],
  );

  // Options that match the search
  const filteredOptions = useMemo(
    () =>
      selectedFilter
        ? search
          ? selectedFilter.options?.filter(({ label }) =>
              label.toLowerCase().includes(search.toLowerCase()),
            )
          : selectedFilter.options
        : null,
    [selectedFilter, search],
  );

  // The currently highlighted option that will be selected on enter press
  const highlightedOptionValue = useMemo(
    () =>
      selectedFilter && search && filteredOptions?.length
        ? filteredOptions[0].value
        : null,
    [filteredOptions, search],
  );

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      onEscapeKeyDown={(e) => {
        selectedFilterKey ? reset() : setIsOpen(false);
        e.preventDefault();
      }}
      content={
        <AnimatedSizeContainer width height>
          <div>
            <input
              type="text"
              className="rounded-t-lg border-0 border-b border-gray-200 px-4 py-3 text-sm ring-0 placeholder:text-gray-400 focus:border-gray-200 focus:ring-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${selectedFilter?.label || "Filter"}...`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (highlightedFilterKey) openFilter(highlightedFilterKey);
                  else if (highlightedOptionValue)
                    selectOption(highlightedOptionValue);
                }
              }}
            />
            <div className="scrollbar-hide max-h-[50vh] overflow-y-scroll p-2">
              {!selectedFilter ? (
                <div className="flex flex-col gap-1" ref={mainListContainer}>
                  {filteredFilters.length ? (
                    filteredFilters.map((filter) => (
                      <FilterButton
                        {...filter}
                        key={filter.key}
                        highlighted={filter.key === highlightedFilterKey}
                        onClick={() => openFilter(filter.key)}
                      />
                    ))
                  ) : (
                    <NoMatches />
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {selectedFilter.options ? (
                    filteredOptions?.length ? (
                      filteredOptions?.map((option) => {
                        const isSelected =
                          activeFilters?.find(
                            ({ key }) => key === selectedFilterKey,
                          )?.value === option.value;

                        return (
                          <FilterButton
                            {...option}
                            key={option.value}
                            right={
                              isSelected ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                option.right
                              )
                            }
                            highlighted={
                              option.value === highlightedOptionValue
                            }
                            onClick={() => selectOption(option.value)}
                          />
                        );
                      })
                    ) : (
                      <NoMatches />
                    )
                  ) : (
                    <div
                      className="flex items-center justify-center px-2 py-4"
                      style={mainListDimensions.current}
                    >
                      <LoadingSpinner />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </AnimatedSizeContainer>
      }
    >
      <button
        type="button"
        className={cn(
          "group flex h-10 cursor-pointer appearance-none items-center gap-x-2 truncate rounded-md border px-3 outline-none transition-all sm:text-sm",
          "border-gray-200 bg-white text-gray-900 placeholder-gray-400 transition-all",
          "disabled:pointer-events-none disabled:bg-gray-100 disabled:text-gray-400",
          "data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
          className,
        )}
      >
        <ListFilter className="h-4 w-4 shrink-0" />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-gray-900">
          {children ?? "Filter"}
        </span>
        <div className="ml-1">
          {activeFilters?.length ? (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[0.625rem] text-white">
              {activeFilters.length}
            </div>
          ) : (
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-75 group-data-[state=open]:rotate-180`}
            />
          )}
        </div>
      </button>
    </Popover>
  );
}

function FilterButton({
  icon: Icon,
  label,
  right,
  highlighted,
  onClick,
  ...rest
}: (Filter | FilterOption) & {
  right?: ReactNode;
  highlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-4 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm hover:bg-gray-100 active:bg-gray-200",
        highlighted && "bg-gray-100",
      )}
      onClick={onClick}
    >
      <span className="shrink-0 text-gray-600">
        {isReactNode(Icon) ? Icon : <Icon className="h-4 w-4" />}
      </span>
      {label}
      <div className="ml-1 flex shrink-0 grow justify-end text-gray-500">
        {right}
      </div>
    </button>
  );
}

const NoMatches = () => (
  <p className="my-1 text-center text-sm text-gray-400">No matches</p>
);

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);

const Filter = { Select };

export { Filter };
