"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps, UserProps } from "@/lib/types";
import {
  NumberTooltip,
  Tooltip,
  useIntersectionObserver,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { LinkifyTooltipContent } from "@dub/ui/src/tooltip";
import {
  cn,
  fetcher,
  getApexDomain,
  linkConstructor,
  nFormatter,
  truncate,
} from "@dub/utils";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { AnalyticsContext } from ".";
import LinkLogo from "../links/link-logo";
import LinkPreviewTooltip from "./link-preview";

export default function BarList({
  tab,
  data,
  barBackground,
  maxClicks,
  setShowModal,
  limit,
}: {
  tab: string;
  data: {
    icon: ReactNode;
    title: string;
    href: string;
    clicks: number;
  }[];
  maxClicks: number;
  barBackground: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  limit?: number;
}) {
  const [search, setSearch] = useState("");

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
          maxClicks={maxClicks}
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
              Clicks
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
  clicks,
  maxClicks,
  tab,
  setShowModal,
  barBackground,
}: {
  icon?: ReactNode;
  title: string;
  href: string;
  clicks: number;
  maxClicks: number;
  tab: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  barBackground: string;
}) {
  const itemRef = useRef<HTMLAnchorElement>(null);
  const entry = useIntersectionObserver(itemRef, {});
  const isVisible = !!entry?.isIntersecting;

  const { id } = useWorkspace();

  const { admin } = useContext(AnalyticsContext);

  const { data } = useSWR<
    LinkProps & {
      user: UserProps;
    }
  >(
    tab === "link" &&
      isVisible &&
      (admin
        ? `/api/admin/links/${title}`
        : `/api/links/${title}?workspaceId=${id}&checkDomain=true`),
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const { queryParams } = useRouterStuff();

  const lineItem = useMemo(() => {
    const apexDomain =
      tab === "link"
        ? data
          ? getApexDomain(data.url)
          : null
        : getApexDomain(title);
    return (
      <div className="z-10 flex items-center space-x-2 px-2">
        {tab === "link" ? (
          data ? (
            <LinkLogo
              apexDomain={apexDomain}
              className="h-5 w-5 sm:h-5 sm:w-5"
            />
          ) : (
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
          )
        ) : tab === "url" ? (
          <LinkLogo apexDomain={apexDomain} className="h-5 w-5 sm:h-5 sm:w-5" />
        ) : (
          icon
        )}
        <div
          className={cn(
            "truncate text-sm text-gray-800",
            href && "underline-offset-4 group-hover:underline",
          )}
        >
          {tab === "link" ? (
            data ? (
              truncate(
                linkConstructor({
                  domain: data.domain,
                  key: data.key,
                  pretty: true,
                }),
                36,
              )
            ) : (
              <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            )
          ) : (
            truncate(title, 36)
          )}
        </div>
      </div>
    );
  }, [data, icon, tab, title]);

  return (
    <Link
      ref={itemRef}
      href={
        tab === "link" && data
          ? (queryParams({
              set: {
                domain: data.domain,
                key: data.key,
              },
              getNewPath: true,
            }) as string)
          : href
      }
      scroll={false}
      onClick={() => setShowModal(false)}
    >
      <div className="group flex items-center justify-between hover:bg-gray-50">
        <div className="relative z-10 flex h-8 w-full max-w-[calc(100%-2rem)] items-center">
          {tab === "link" && data ? (
            <Tooltip content={<LinkPreviewTooltip data={data} />}>
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
              width: `${(clicks / (maxClicks || 0)) * 100}%`,
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
        <NumberTooltip value={clicks}>
          <p className="z-10 px-2 text-sm text-gray-600">
            {nFormatter(clicks)}
          </p>
        </NumberTooltip>
      </div>
    </Link>
  );
}
