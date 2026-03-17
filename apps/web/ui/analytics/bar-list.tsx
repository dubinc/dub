"use client";

import { LinkProps } from "@/lib/types";
import { Button, Tooltip, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { FilterBars } from "@dub/ui/icons";
import { cn, getPrettyUrl } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  ComponentProps,
  Dispatch,
  memo,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { areEqual, FixedSizeList } from "react-window";
import { AnalyticsContext } from "./analytics-provider";
import LinkPreviewTooltip from "./link-preview";

export function BarList({
  tab,
  unit,
  data,
  allData,
  barBackground,
  hoverBackground,
  filterSelectedBackground = "bg-neutral-900",
  filterSelectedHoverBackground,
  filterHoverClass,
  maxValue,
  setShowModal,
  limit,
  selectedFilterValues,
  activeFilterValues,
  onToggleFilter,
  onClearFilter,
  onClearSelection,
  onApplyFilterValues,
}: {
  tab: string;
  unit: string;
  data: {
    icon: ReactNode;
    title: string;
    filterValue?: string;
    value: number;
    linkId?: string;
  }[];
  allData?: {
    icon: ReactNode;
    title: string;
    filterValue?: string;
    value: number;
    linkId?: string;
  }[];
  maxValue: number;
  barBackground: string;
  hoverBackground: string;
  filterSelectedBackground?: string;
  filterSelectedHoverBackground?: string;
  filterHoverClass?: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  limit?: number;
  selectedFilterValues?: string[];
  activeFilterValues?: string[];
  onToggleFilter?: (val: string) => void;
  onClearFilter?: () => void;
  onClearSelection?: () => void;
  onApplyFilterValues?: (values: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [modalSelectedValues, setModalSelectedValues] = useState<string[]>(
    activeFilterValues ?? [],
  );

  useEffect(() => {
    if (!limit) {
      setModalSelectedValues(activeFilterValues ?? []);
    }
  }, [activeFilterValues, limit]);

  const handleModalToggle = useCallback((val: string) => {
    setModalSelectedValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }, []);

  const hasSelection = (selectedFilterValues?.length ?? 0) > 0;
  const hasModalSelection = modalSelectedValues.length > 0;

  useKeyboardShortcut("Escape", () => onClearSelection?.(), {
    priority: 2,
    enabled: hasSelection && !!onClearSelection,
  });

  const effectiveSelectedValues = !limit
    ? modalSelectedValues
    : selectedFilterValues;

  const sourceData = !limit && allData ? allData : data;

  // Calculate total sum for percentage calculations
  const totalSum = useMemo(
    () => sourceData.reduce((sum, item) => sum + item.value, 0),
    [sourceData],
  );

  // TODO: mock pagination for better perf in React
  const filteredData = useMemo(() => {
    if (limit) {
      return data.slice(0, limit);
    } else {
      return search
        ? sourceData.filter((d) =>
            d.title.toLowerCase().includes(search.toLowerCase()),
          )
        : sourceData;
    }
  }, [data, sourceData, limit, search]);

  const { isMobile } = useMediaQuery();

  const virtualize = filteredData.length > 100;

  const itemProps = filteredData.map((data) => ({
    ...data,
    maxValue,
    totalSum,
    tab,
    unit,
    setShowModal,
    barBackground,
    hoverBackground,
    filterSelectedBackground,
    filterSelectedHoverBackground,
    filterHoverClass,
    limit,
    isSelected: data.filterValue
      ? (effectiveSelectedValues ?? []).includes(data.filterValue)
      : false,
    isActivelyFiltered:
      !!limit &&
      !!data.filterValue &&
      (activeFilterValues ?? []).includes(data.filterValue),
    onFilterClick: data.filterValue
      ? !limit
        ? () => handleModalToggle(data.filterValue!)
        : onToggleFilter
          ? () => onToggleFilter(data.filterValue!)
          : undefined
      : undefined,
  }));

  const filterButtons = hasSelection &&
    onApplyFilterValues &&
    onClearFilter && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ ease: "easeOut", duration: 0.15 }}
        className="absolute bottom-0 left-0 z-20 flex w-full items-end"
      >
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-white" />
        <div className="relative flex w-full items-center justify-center gap-2 py-4">
          <Button
            text="Filter"
            variant="primary"
            className="h-8 w-fit rounded-lg px-3 py-2"
            onClick={() => onApplyFilterValues(selectedFilterValues ?? [])}
          />
          <Button
            text="Clear"
            variant="secondary"
            className="h-8 w-fit rounded-lg px-3 py-2"
            onClick={onClearFilter}
          />
        </div>
      </motion.div>
    );

  const bars = (
    <NumberFlowGroup>
      <div className="relative grid h-full auto-rows-min grid-cols-1">
        {virtualize ? (
          <AutoSizer>
            {({ width, height }) => (
              <FixedSizeList
                width={width}
                height={height}
                itemCount={filteredData.length}
                itemSize={40}
                itemData={itemProps}
              >
                {VirtualLineItem}
              </FixedSizeList>
            )}
          </AutoSizer>
        ) : (
          filteredData.map((data, idx) => (
            <LineItem key={idx} {...itemProps[idx]} />
          ))
        )}
      </div>
    </NumberFlowGroup>
  );

  if (limit) {
    return (
      <>
        {bars}
        <AnimatePresence>{filterButtons}</AnimatePresence>
      </>
    );
  } else {
    return (
      <>
        <div className="relative px-4 py-3">
          <div className="pointer-events-none absolute inset-y-0 left-7 flex items-center">
            <Search className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="text"
            autoFocus={!isMobile}
            className="w-full rounded-md border border-neutral-300 py-2 pl-10 text-black placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-200 sm:text-sm"
            placeholder={`Search ${tab}...`}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <div className="h-[50vh] overflow-auto pb-4 md:h-[40vh]">{bars}</div>
          {hasModalSelection && onApplyFilterValues && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-[130px] items-end justify-center bg-gradient-to-t from-white from-40% to-white/0 pb-4">
              <div className="pointer-events-auto flex items-center gap-2">
                <Button
                  text="Filter"
                  variant="primary"
                  className="h-8 w-fit rounded-lg px-3 py-2"
                  onClick={() => {
                    onApplyFilterValues(modalSelectedValues);
                    setShowModal(false);
                  }}
                />

                <Button
                  text="Clear"
                  variant="secondary"
                  className="h-8 w-fit rounded-lg px-3 py-2"
                  onClick={() => {
                    setModalSelectedValues([]);
                    onClearFilter?.();
                    setShowModal(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}

export function LineItem({
  icon,
  title,
  value,
  totalSum,
  tab,
  unit,
  setShowModal,
  barBackground,
  hoverBackground,
  filterSelectedBackground = "bg-neutral-900",
  filterSelectedHoverBackground,
  filterHoverClass,
  linkData,
  limit,
  isSelected,
  isActivelyFiltered,
  onFilterClick,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  totalSum: number;
  tab: string;
  unit: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  barBackground: string;
  hoverBackground: string;
  filterSelectedBackground?: string;
  filterSelectedHoverBackground?: string;
  filterHoverClass?: string;
  linkData?: LinkProps;
  limit?: number;
  isSelected?: boolean;
  isActivelyFiltered?: boolean;
  onFilterClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [filterButtonHovered, setFilterButtonHovered] = useState(false);
  const [tooltipResetKey, setTooltipResetKey] = useState(0);
  const { saleUnit } = useContext(AnalyticsContext);

  const percentage = Math.round((value / totalSum) * 1000) / 10;
  const isModalView = !limit;

  const lineItem = (
    <div className="z-10 flex items-center space-x-4 overflow-hidden px-3">
      {onFilterClick ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isActivelyFiltered) onFilterClick();
          }}
          onMouseEnter={() => {
            setFilterButtonHovered(true);
            setTooltipResetKey((k) => k + 1);
          }}
          onMouseLeave={() => setFilterButtonHovered(false)}
          aria-label={`${isSelected ? "Remove" : "Add"} filter: ${title}`}
          aria-pressed={isSelected}
          className="relative size-6 shrink-0 cursor-pointer"
        >
          <div
            className={cn(
              "flex size-full items-center justify-center transition-all duration-200",
              isSelected || isHovered ? "translate-x-3 opacity-0" : "",
            )}
          >
            {icon}
          </div>
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-lg transition-all duration-200",
              isSelected
                ? cn(
                    "translate-x-0 opacity-100",
                    filterSelectedBackground,
                    filterSelectedHoverBackground,
                  )
                : isHovered
                  ? cn(
                      "translate-x-0 opacity-100",
                      isActivelyFiltered
                        ? cn(
                            filterSelectedBackground,
                            filterSelectedHoverBackground,
                          )
                        : filterHoverClass,
                    )
                  : "-translate-x-3 opacity-0",
            )}
          >
            <FilterBars
              className={cn(
                "size-3",
                isSelected || isActivelyFiltered
                  ? "text-white"
                  : "text-neutral-500",
              )}
            />
          </div>
        </button>
      ) : (
        <div className="flex size-6 shrink-0 items-center justify-center">
          {icon}
        </div>
      )}
      {tab === "links" && linkData ? (
        <Tooltip
          key={tooltipResetKey}
          content={<LinkPreviewTooltip data={linkData} />}
          disabled={filterButtonHovered}
        >
          <div className="truncate text-sm text-neutral-800">
            {getPrettyUrl(title)}
          </div>
        </Tooltip>
      ) : tab === "urls" ? (
        <Tooltip
          key={tooltipResetKey}
          content={`[${title}](${title})`}
          contentClassName="max-w-lg"
          disabled={filterButtonHovered}
        >
          <div className="truncate text-sm text-neutral-800">
            {getPrettyUrl(title)}
          </div>
        </Tooltip>
      ) : (
        <div className="truncate text-sm text-neutral-800">
          {getPrettyUrl(title)}
        </div>
      )}
    </div>
  );

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (onFilterClick && !isActivelyFiltered) onFilterClick();
      }}
      className={cn(
        "group block min-w-0 border-l-2 border-transparent px-4 py-1 transition-all",
        onFilterClick && !isActivelyFiltered && "cursor-pointer",
        hoverBackground,
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-between",
          isModalView && "gap-16",
        )}
      >
        <motion.div
          style={{
            width: `${percentage}%`,
            position: "absolute",
            inset: 0,
          }}
          className={cn("-z-10 h-full origin-left rounded-md", barBackground)}
          transition={{ ease: "easeOut", duration: 0.3 }}
          initial={{ transform: "scaleX(0)" }}
          animate={{ transform: "scaleX(1)" }}
        />
        <div className="relative z-10 flex h-8 w-full min-w-0 max-w-[calc(100%-2rem)] items-center transition-[max-width] duration-300 ease-in-out group-hover:max-w-[calc(100%-5rem)]">
          {lineItem}
        </div>
        <div className="z-10 flex items-center">
          <NumberFlow
            value={
              unit === "sales" && saleUnit === "saleAmount"
                ? value / 100
                : value
            }
            className={cn(
              "z-10 px-2 text-sm text-neutral-600 transition-transform duration-300",
              isModalView ? "-translate-x-14" : "group-hover:-translate-x-14",
            )}
            style={{
              // Adds translateZ(0) to fix transition jitter
              transform: `translateX(var(--tw-translate-x, 0)) translateZ(0)`,
            }}
            format={
              unit === "sales" && saleUnit === "saleAmount"
                ? {
                    style: "currency",
                    currency: "USD",
                  }
                : {
                    notation: value > 999999 ? "compact" : "standard",
                  }
            }
          />
          <div
            className={cn(
              "absolute right-0 px-3 text-sm text-neutral-600/70 transition-all duration-300",
              isModalView
                ? "visible translate-x-0 opacity-100"
                : "invisible translate-x-14 opacity-0 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100",
            )}
            style={{
              // Adds translateZ(0) to fix transition jitter
              transform: `translateX(var(--tw-translate-x, 0)) translateZ(0)`,
            }}
          >
            {percentage}%
          </div>
        </div>
      </div>
    </div>
  );
}

const VirtualLineItem = memo(
  ({
    data,
    index,
    style,
  }: {
    data: ComponentProps<typeof LineItem>[];
    index: number;
    style: any;
  }) => {
    const props = data[index];

    return (
      <div style={style}>
        <LineItem {...props} />
      </div>
    );
  },
  areEqual,
);
