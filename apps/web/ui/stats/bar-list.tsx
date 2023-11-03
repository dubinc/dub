"use client";

import { UserProps } from "@/lib/types";
import { Avatar, CopyButton, NumberTooltip, Tooltip } from "@dub/ui";
import {
  GOOGLE_FAVICON_URL,
  cn,
  fetcher,
  getApexDomain,
  linkConstructor,
  nFormatter,
  timeAgo,
} from "@dub/utils";
import { Link as LinkProps } from "@prisma/client";
import { motion } from "framer-motion";
import { Archive, EyeOff, Globe, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from "react";
import useSWR from "swr";
import { BlurImage } from "../shared/blur-image";
import punycode from "punycode/";

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
    icon?: ReactNode;
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

  const bars = (
    <div className="grid gap-4">
      {filteredData.map(({ icon, title, href, clicks }, idx) => {
        const lineItem = (
          <div className="z-10 flex items-center space-x-2 px-2">
            {icon}
            <p
              className={cn(
                "text-sm text-gray-800",
                href && "underline-offset-4 group-hover:underline",
              )}
            >
              {title}
            </p>
          </div>
        );

        return (
          <Link
            key={idx}
            href={href}
            scroll={false}
            onClick={() => setShowModal(false)}
          >
            <div key={idx} className="group flex items-center justify-between">
              <div className="relative z-10 flex w-full max-w-[calc(100%-2rem)] items-center">
                {tab === "Top Links" ? (
                  <Tooltip
                    content={
                      <LinkPreviewTooltip
                        domain={title.split("/")[0]}
                        _key={title.split("/")[1]}
                      />
                    }
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
                    "absolute h-8 origin-left rounded-sm",
                    barBackground,
                  )}
                  transition={{ ease: "easeOut", duration: 0.3 }}
                  initial={{ transform: "scaleX(0)" }}
                  animate={{ transform: "scaleX(1)" }}
                />
              </div>
              <NumberTooltip value={clicks}>
                <p className="z-10 text-sm text-gray-600">
                  {nFormatter(clicks)}
                </p>
              </NumberTooltip>
            </div>
          </Link>
        );
      })}
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
            autoFocus
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

const LinkPreviewTooltip = ({
  domain,
  _key,
}: {
  domain: string;
  _key?: string;
}) => {
  const key = _key;
  const { slug } = useParams() as { slug?: string };
  const { data, isLoading } = useSWR<
    LinkProps & {
      user: UserProps;
    }
  >(
    key
      ? `/api${
          slug ? `/projects/${slug}` : ""
        }/links/info?domain=${domain}&key=${key}`
      : `/api/projects/${slug}/domains/${domain}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );
  if (isLoading) {
    return (
      <div className="relative flex w-[28rem] items-center px-4 py-2">
        <div className="mr-2 h-8 w-8 animate-pulse rounded-full bg-gray-200 sm:h-10 sm:w-10" />
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-40 animate-pulse rounded-md bg-gray-200" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
            <div className="h-5 w-48 animate-pulse rounded-md bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="relative flex w-[28rem] items-center space-x-3 px-4 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
          <Trash className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
        </div>
        <div className="flex flex-col space-y-1">
          <p className="w-full max-w-[140px] truncate text-sm font-semibold text-gray-500 line-through sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]">
            {linkConstructor({
              domain: punycode.toUnicode(domain || ""),
              key,
              pretty: true,
            })}
          </p>
          <p className="text-sm text-gray-500">This link has been deleted.</p>
        </div>
      </div>
    );
  }

  const { url, rewrite, createdAt, archived, user } = data;
  const apexDomain = getApexDomain(url);

  return (
    <div className="relative flex w-[28rem] items-center justify-between px-4 py-2">
      <div className="relative flex shrink items-center">
        {archived ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
            <Archive className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
          </div>
        ) : url ? (
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={apexDomain}
            className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
            width={20}
            height={20}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 px-0 sm:h-10 sm:w-10">
            <Globe className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
          </div>
        )}
        {/* 
            Here, we're manually setting ml-* values because if we do space-x-* in the parent div, 
            it messes up the tooltip positioning.
          */}
        <div className="ml-2 sm:ml-4">
          <div className="flex max-w-fit items-center space-x-2">
            <a
              className={cn(
                "w-full max-w-[140px] truncate text-sm font-semibold text-blue-800 sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]",
                {
                  "text-gray-500": archived,
                },
              )}
              href={linkConstructor({ domain, key })}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {linkConstructor({
                domain: punycode.toUnicode(domain || ""),
                key,
                pretty: true,
              })}
            </a>
            <CopyButton value={linkConstructor({ domain, key })} />
          </div>
          <div className="flex max-w-fit items-center space-x-1">
            {user && (
              <>
                <Avatar user={user} className="h-4 w-4" />
                <p>•</p>
              </>
            )}
            {createdAt && (
              <>
                <p
                  className="whitespace-nowrap text-sm text-gray-500"
                  suppressHydrationWarning
                >
                  {timeAgo(createdAt)}
                </p>
                <p>•</p>
              </>
            )}
            {rewrite && (
              <EyeOff className="xs:block hidden h-4 w-4 text-gray-500" />
            )}
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="xs:block hidden max-w-[240px] truncate text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
              >
                {url}
              </a>
            ) : (
              <p className="xs:block hidden max-w-[240px] truncate text-sm font-medium text-gray-700 underline-offset-2 hover:underline">
                No redirect configured
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
