"use client";

import { LinkProps } from "@/lib/types";
import { LinkifyTooltipContent, Tooltip, useMediaQuery } from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  ComponentProps,
  Dispatch,
  memo,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { areEqual, FixedSizeList } from "react-window";
import { AnalyticsContext } from "./analytics-provider";
import LinkPreviewTooltip from "./link-preview";

export default function BarList({
  tab,
  unit,
  data,
  barBackground,
  hoverBackground,
  maxValue,
  setShowModal,
  limit,
}: {
  tab: string;
  unit: string;
  data: {
    icon: ReactNode;
    title: string;
    href?: string;
    value: number;
    linkId?: string;
  }[];
  maxValue: number;
  barBackground: string;
  hoverBackground: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  limit?: number;
}) {
  const [search, setSearch] = useState("");

  // Calculate total sum for percentage calculations
  const totalSum = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );

  // TODO: mock pagination for better perf in React
  const filteredData = useMemo(() => {
    if (limit) {
      return data.slice(0, limit);
    } else {
      return search
        ? data.filter((d) =>
            d.title.toLowerCase().includes(search.toLowerCase()),
          )
        : data;
    }
  }, [data, limit, search]);

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
    limit,
  }));

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
    return bars;
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
        <div className="h-[50vh] overflow-auto pb-4 md:h-[40vh]">{bars}</div>
      </>
    );
  }
}

export function LineItem({
  icon,
  title,
  href,
  value,
  totalSum,
  tab,
  unit,
  setShowModal,
  barBackground,
  hoverBackground,
  linkData,
  limit,
}: {
  icon: ReactNode;
  title: string;
  href?: string;
  value: number;
  totalSum: number;
  tab: string;
  unit: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  barBackground: string;
  hoverBackground: string;
  linkData?: LinkProps;
  limit?: number;
}) {
  const lineItem = useMemo(() => {
    return (
      <div className="z-10 flex items-center space-x-4 overflow-hidden px-3">
        {icon}
        <div className="truncate text-sm text-neutral-800">
          {getPrettyUrl(title)}
        </div>
      </div>
    );
  }, [icon, tab, title]);

  const { saleUnit } = useContext(AnalyticsContext);

  const As = href ? Link : "div";

  // Calculate percentage against total sum and round to 1 decimal
  const percentage = Math.round((value / totalSum) * 1000) / 10;

  // Check if we're in modal view - if limit is undefined, we're in the modal view
  const isModalView = !limit;

  return (
    // @ts-ignore - we know if it's a Link it'll get its href
    <As
      {...(href && {
        href,
        scroll: false,
        onClick: () => setShowModal(false),
      })}
      className={cn(
        `block min-w-0 border-l-2 border-transparent px-4 py-1 transition-all`,
        href && hoverBackground,
        isModalView ? "group" : "",
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
          {tab === "links" && linkData ? (
            <Tooltip content={<LinkPreviewTooltip data={linkData} />}>
              {lineItem}
            </Tooltip>
          ) : tab === "urls" ? (
            <Tooltip
              content={
                <div className="overflow-auto px-4 py-2">
                  <LinkifyTooltipContent>{title}</LinkifyTooltipContent>
                </div>
              }
            >
              {lineItem}
            </Tooltip>
          ) : (
            lineItem
          )}
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
                    // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                    trailingZeroDisplay: "stripIfInteger",
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
    </As>
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
