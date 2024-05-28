"use client";

import { LinkProps } from "@/lib/types";
import { NumberTooltip, Tooltip, useMediaQuery } from "@dub/ui";
import { LinkifyTooltipContent } from "@dub/ui/src/tooltip";
import { capitalize, cn, nFormatter, truncate } from "@dub/utils";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnalyticsContext } from ".";
import LinkPreviewTooltip from "./link-preview";

export default function BarList({
  tab,
  data,
  barBackground,
  maxValue,
  setShowModal,
  limit,
}: {
  tab: string;
  data: {
    icon: ReactNode;
    title: string;
    href: string;
    value: number;
    linkId?: string;
  }[];
  maxValue: number;
  barBackground: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  limit?: number;
}) {
  const [search, setSearch] = useState("");

  const { selectedTab } = useContext(AnalyticsContext);

  // TODO: mock pagination for better perf in React
  // TODO: fix for top links since it's technically link IDs
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
    <div className="grid gap-1">
      {filteredData.map((data, idx) => (
        <LineItem
          key={idx}
          {...data}
          maxValue={maxValue}
          tab={tab}
          setShowModal={setShowModal}
          barBackground={barBackground}
        />
      ))}
    </div>
  );

  if (limit) {
    return bars;
  } else {
    return (
      <>
        <div className="relative p-4">
          <div className="pointer-events-none absolute inset-y-0 left-7 flex items-center">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            autoFocus={!isMobile}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 text-black placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-gray-600 sm:text-sm"
            placeholder={`Search ${tab}...`}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <div className="flex justify-between px-4 pb-1 pt-0">
            <p className="text-xs font-semibold uppercase text-gray-600">
              {tab}
            </p>
            <p className="text-xs font-semibold uppercase text-gray-600">
              {capitalize(selectedTab)}
            </p>
          </div>
          <div className="h-[50vh] overflow-auto p-4 md:h-[40vh]">{bars}</div>
        </div>
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
  setShowModal,
  barBackground,
  linkData,
}: {
  icon: ReactNode;
  title: string;
  href: string;
  value: number;
  maxValue: number;
  tab: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  barBackground: string;
  linkData?: LinkProps;
}) {
  const lineItem = useMemo(() => {
    return (
      <div className="z-10 flex items-center space-x-2 px-2">
        {icon}
        <div
          className={cn(
            "truncate text-sm text-gray-800",
            href && "underline-offset-4 group-hover:underline",
          )}
        >
          {truncate(title, 36)}
        </div>
      </div>
    );
  }, [icon, tab, title]);

  return (
    <Link href={href} scroll={false} onClick={() => setShowModal(false)}>
      <div className="group flex items-center justify-between hover:bg-gray-50">
        <div className="relative z-10 flex h-8 w-full max-w-[calc(100%-2rem)] items-center">
          {tab === "link" && linkData ? (
            <Tooltip content={<LinkPreviewTooltip data={linkData} />}>
              {lineItem}
            </Tooltip>
          ) : tab === "url" ? (
            <Tooltip
              content={<LinkifyTooltipContent>{title}</LinkifyTooltipContent>}
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
              "absolute h-full origin-left rounded-sm",
              barBackground,
            )}
            transition={{ ease: "easeOut", duration: 0.3 }}
            initial={{ transform: "scaleX(0)" }}
            animate={{ transform: "scaleX(1)" }}
          />
        </div>
        <NumberTooltip value={value}>
          <p className="z-10 px-2 text-sm text-gray-600">{nFormatter(value)}</p>
        </NumberTooltip>
      </div>
    </Link>
  );
}
