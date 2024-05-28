import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { Check, ChevronDown, ListFilter, LucideIcon } from "lucide-react";
import {
  CSSProperties,
  ReactNode,
  isValidElement,
  useCallback,
  useEffect,
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

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      onEscapeKeyDown={(e) => {
        if (selectedFilterKey) e.preventDefault();
      }}
      content={
        <AnimatedSizeContainer width height>
          <Command>
            <Command.Input
              size={1}
              className="w-full rounded-t-lg border-0 border-b border-gray-200 px-4 py-3 text-sm ring-0 placeholder:text-gray-400 focus:border-gray-200 focus:ring-0"
              placeholder={`${selectedFilter?.label || "Filter"}...`}
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key === "Escape" || (e.key === "Backspace" && !search)) {
                  e.preventDefault();
                  selectedFilterKey ? reset() : setIsOpen(false);
                }
              }}
            />
            <div
              className="scrollbar-hide max-h-[50vh] overflow-y-scroll p-2"
              ref={mainListContainer}
            >
              {!selectedFilter ? (
                <Command.List className="flex min-w-[150px] flex-col gap-1">
                  {filters.map((filter) => (
                    <FilterButton
                      {...filter}
                      key={filter.key}
                      // highlighted={filter.key === highlightedFilterKey}
                      onSelect={() => openFilter(filter.key)}
                    />
                  ))}
                  <NoMatches />
                </Command.List>
              ) : (
                <Command.List className="flex min-w-[100px] flex-col gap-1">
                  {selectedFilter.options ? (
                    <>
                      {selectedFilter.options?.map((option) => {
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
                            onSelect={() => selectOption(option.value)}
                          />
                        );
                      })}
                      <NoMatches />
                    </>
                  ) : (
                    <Command.Loading>
                      <div
                        className="flex items-center justify-center px-2 py-4"
                        style={mainListDimensions.current}
                      >
                        <LoadingSpinner />
                      </div>
                    </Command.Loading>
                  )}
                </Command.List>
              )}
            </div>
          </Command>
        </AnimatedSizeContainer>
      }
    >
      <button
        type="button"
        className={cn(
          "group flex h-10 cursor-pointer appearance-none items-center gap-x-2 truncate rounded-md border px-3 outline-none transition-all sm:text-sm",
          "border-gray-200 bg-white text-gray-900 placeholder-gray-400 transition-all",
          "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
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
  onSelect,
}: (Filter | FilterOption) & {
  right?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer items-center gap-4 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm",
        "data-[selected=true]:bg-gray-100",
      )}
      onSelect={onSelect}
      value={label}
    >
      <span className="shrink-0 text-gray-600">
        {isReactNode(Icon) ? Icon : <Icon className="h-4 w-4" />}
      </span>
      {label}
      <div className="ml-1 flex shrink-0 grow justify-end text-gray-500">
        {right}
      </div>
    </Command.Item>
  );
}

const NoMatches = ({ style }: { style?: CSSProperties }) => (
  <Command.Empty
    className="my-1 text-center text-sm text-gray-400"
    style={style}
  >
    No matches
  </Command.Empty>
);

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);

const Filter = { Select };

export { Filter };
