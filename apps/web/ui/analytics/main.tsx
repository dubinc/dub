import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import useTags from "@/lib/swr/use-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { CountingNumbers, NumberTooltip, useRouterStuff } from "@dub/ui";
import {
  COUNTRIES,
  capitalize,
  cn,
  fetcher,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { ChevronRight, Lock, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsContext } from ".";
import AnalyticsAreaChart from "./analytics-area-chart";

type Tab = {
  id: string;
  label: string;
  colorClassName: string;
  show: ("clicks" | "leads" | "sales")[];
};

export default function Main() {
  const { betaTester } = useWorkspace();
  const {
    baseApiPathGeneric,
    queryString,
    requiresUpgrade,
    demo,
    selectedTab,
  } = useContext(AnalyticsContext);
  const searchParams = useSearchParams();
  const domain = searchParams.get("domain");
  const key = searchParams.get("key");
  const { queryParams } = useRouterStuff();

  // Tag related
  const tagId = searchParams.get("tagId");
  const { tags } = useTags();

  // Root domain related
  const root = searchParams.get("root");

  const tabs = useMemo(
    () =>
      [
        {
          id: "clicks",
          label: "Clicks",
          colorClassName: "text-blue-500/50",
          show: ["clicks"],
        },
        ...(betaTester || demo
          ? [
              {
                id: "leads",
                label: "Leads",
                colorClassName: "text-violet-600/50",
                show: ["leads"],
              },
              {
                id: "sales",
                label: "Sales",
                colorClassName: "text-teal-400/50",
                show: ["sales"],
              },
            ]
          : []),
      ] as Tab[],
    [betaTester],
  );

  const tab =
    betaTester || demo
      ? tabs.find(({ id }) => id === selectedTab) || {
          id: "composite",
          show: ["clicks", "leads", "sales"],
        }
      : tabs[0];

  const { data: totalClicks } = useSWR<number>(
    `${baseApiPathGeneric}/clicks/count?${queryString}`,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  const { data: totalLeads } = useSWR<number>(
    `${baseApiPathGeneric}/leads/count?${queryString}`,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  const { data: totalSales } = useSWR<number>(
    `${baseApiPathGeneric}/sales/count?${queryString}`,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  return (
    <div className="w-full overflow-hidden border border-gray-200 bg-white sm:rounded-xl">
      <div className="scrollbar-hide mb-5 flex w-full divide-x overflow-y-hidden overflow-x-scroll border-b border-gray-200">
        {tabs.map(({ id, label, colorClassName }, idx) => {
          const total = {
            clicks: totalClicks,
            leads: totalLeads,
            sales: totalSales,
          }[id];

          return (
            <div key={id} className="relative z-0">
              {idx > 0 && (
                <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-1.5">
                  <ChevronRight
                    className="h-3 w-3 text-gray-400"
                    strokeWidth={2.5}
                  />
                </div>
              )}
              <Link
                className={cn(
                  "border-box relative block h-full min-w-[140px] flex-none px-4 py-3 sm:min-w-[240px] sm:px-8 sm:py-6",
                  "transition-colors hover:bg-gray-50 active:bg-gray-100",
                )}
                href={
                  (tab.id === id
                    ? queryParams({
                        del: "tab",
                        getNewPath: true,
                      })
                    : queryParams({
                        set: {
                          tab: id,
                        },
                        getNewPath: true,
                      })) as string
                }
                aria-current
              >
                {/* Active tab indicator */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                    tab.id !== id && "translate-y-[3px]", // Translate an extra pixel to avoid sub-pixel issues
                  )}
                />

                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                      colorClassName,
                    )}
                  />
                  <span>{label}</span>
                </div>
                <div className="mt-1 flex">
                  {total || total === 0 ? (
                    <NumberTooltip value={total} unit={label.toLowerCase()}>
                      <CountingNumbers as="h1" className="text-3xl font-medium">
                        {total}
                      </CountingNumbers>
                    </NumberTooltip>
                  ) : requiresUpgrade ? (
                    <div className="block rounded-full bg-gray-100 p-2.5">
                      <Lock className="h-4 w-4 text-gray-500" />
                    </div>
                  ) : (
                    <div className="h-9 w-12 animate-pulse rounded-md bg-gray-200" />
                  )}
                </div>
              </Link>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-end gap-2 p-5 sm:p-10">
          {domain &&
            (key ? (
              <Link
                href={
                  queryParams({
                    del: ["domain", "key"],
                    getNewPath: true,
                  }) as string
                }
                className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 transition-all hover:bg-gray-100"
              >
                <p>Link</p>
                <strong className="text-gray-800">
                  {truncate(linkConstructor({ domain, key, pretty: true }), 24)}
                </strong>
                <X className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={
                  queryParams({
                    del: "domain",
                    getNewPath: true,
                  }) as string
                }
                className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 transition-all hover:bg-gray-100"
              >
                <p>Domain</p>
                <strong className="text-gray-800">{domain}</strong>
                <X className="h-4 w-4" />
              </Link>
            ))}
          {tags && tagId && (
            <Link
              href={
                queryParams({
                  del: "tagId",
                  getNewPath: true,
                }) as string
              }
              className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 transition-all hover:bg-gray-100"
            >
              <p>Tag</p>
              <strong className="text-gray-800">
                {tags.find((tag) => tag.id === tagId)?.name || tagId}
              </strong>
              <X className="h-4 w-4" />
            </Link>
          )}
          {root && (
            <Link
              href={
                queryParams({
                  del: "root",
                  getNewPath: true,
                }) as string
              }
              className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 transition-all hover:bg-gray-100"
            >
              <strong className="text-gray-800">
                {root === "true" ? "Domains" : "Links"}
              </strong>
              <p>Only</p>
              <X className="h-4 w-4" />
            </Link>
          )}
          {VALID_ANALYTICS_FILTERS.map((filter) => {
            if (filter === "tagId" || filter === "qr" || filter === "root")
              return null;
            const value = searchParams?.get(filter);
            if (!value) return null;
            return (
              <Link
                key={filter}
                href={
                  queryParams({
                    del: filter,
                    getNewPath: true,
                  }) as string
                }
                className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 transition-all hover:bg-gray-100"
              >
                <p>{capitalize(filter)}</p>
                <strong className="text-gray-800">
                  {filter === "country"
                    ? COUNTRIES[value]
                    : truncate(value, 24)}
                </strong>
                <X className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      </div>
      <div className="p-5 sm:p-10">
        <AnalyticsAreaChart show={tab.show} />
      </div>
    </div>
  );
}
