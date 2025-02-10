"use client";

import { LinkProps } from "@/lib/types";
import {
  LinkifyTooltipContent,
  Tooltip,
  useIntersectionObserver,
  useMediaQuery,
} from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
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

  const bars = (
    <NumberFlowGroup>
      <div className="grid">
        {filteredData.map((data, idx) => (
          <LineItem
            key={idx}
            {...data}
            maxValue={maxValue}
            tab={tab}
            unit={unit}
            setShowModal={setShowModal}
            barBackground={barBackground}
            hoverBackground={hoverBackground}
            virtualize={filteredData.length > 100 && !limit}
          />
        ))}
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
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            autoFocus={!isMobile}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 text-black placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-200 sm:text-sm"
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
  maxValue,
  tab,
  unit,
  setShowModal,
  barBackground,
  hoverBackground,
  linkData,
  virtualize,
}: {
  icon: ReactNode;
  title: string;
  href?: string;
  value: number;
  maxValue: number;
  tab: string;
  unit: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  barBackground: string;
  hoverBackground: string;
  linkData?: LinkProps;
  virtualize?: boolean;
}) {
  const lineItem = useMemo(() => {
    return (
      <div className="z-10 flex items-center space-x-4 overflow-hidden px-3">
        {icon}
        <div className="truncate text-sm text-gray-800">
          {getPrettyUrl(title)}
        </div>
      </div>
    );
  }, [icon, tab, title]);

  const { saleUnit } = useContext(AnalyticsContext);

  const As = href ? Link : "div";

  const Wrapper = virtualize ? VirtualizedItem : "div";

  return (
    <Wrapper>
      {/* @ts-ignore - we know if it's a Link it'll get its href */}
      <As
        {...(href && {
          href,
          scroll: false,
          onClick: () => setShowModal(false),
        })}
        className={cn(
          `block min-w-0 border-l-2 border-transparent px-4 py-1 transition-all`,
          href && hoverBackground,
        )}
      >
        <div className="group flex items-center justify-between">
          <div className="relative z-10 flex h-8 w-full min-w-0 max-w-[calc(100%-2rem)] items-center">
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
            <motion.div
              style={{
                width: `${(value / (maxValue || 0)) * 100}%`,
              }}
              className={cn(
                "absolute h-full origin-left rounded-md",
                barBackground,
              )}
              transition={{ ease: "easeOut", duration: 0.3 }}
              initial={{ transform: "scaleX(0)" }}
              animate={{ transform: "scaleX(1)" }}
            />
          </div>
          <NumberFlow
            value={
              unit === "sales" && saleUnit === "saleAmount"
                ? value / 100
                : value
            }
            className="z-10 px-2 text-sm text-gray-600"
            format={
              unit === "sales" && saleUnit === "saleAmount"
                ? {
                    style: "currency",
                    currency: "USD",
                    // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                    trailingZeroDisplay: "stripIfInteger",
                  }
                : {
                    notation: value > 999999 ? "compact" : "standard",
                  }
            }
          />
        </div>
      </As>
    </Wrapper>
  );
}

function VirtualizedItem({ children }: PropsWithChildren) {
  const ref = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(ref);

  return (
    <div ref={ref} className="h-10">
      {entry?.isIntersecting && children}
    </div>
  );
}
