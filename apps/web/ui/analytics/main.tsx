import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import useTags from "@/lib/swr/use-tags";
import { CountingNumbers, NumberTooltip, useRouterStuff } from "@dub/ui";
import {
  COUNTRIES,
  capitalize,
  cn,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crosshair,
  Lock,
  LucideIcon,
  MousePointerClick,
  Receipt,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useContext, useMemo } from "react";
import { AnalyticsContext } from ".";
import AnalyticsAreaChart from "./analytics-area-chart";

type Tab = {
  id: string;
  icon: LucideIcon;
  label: string;
  resource: "clicks" | "leads" | "sales";
};

export default function Main() {
  const { betaTester } = { betaTester: true }; //useWorkspace();
  const { totalClicks, requiresUpgrade } = useContext(AnalyticsContext);
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
          icon: MousePointerClick,
          label: "Clicks",
          resource: "clicks",
        },
        ...(betaTester
          ? [
              {
                id: "leads",
                icon: Crosshair,
                label: "Leads",
                resource: "leads",
              },
              { id: "sales", icon: Receipt, label: "Sales", resource: "sales" },
            ]
          : []),
      ] as Tab[],
    [betaTester],
  );

  const tab =
    tabs.find(({ id }) => id === (searchParams.get("tab") || "clicks")) ||
    tabs[0];

  return (
    <div className="w-full overflow-hidden border border-gray-200 bg-white sm:rounded-xl">
      <div className="scrollbar-hide mb-5 flex w-full divide-x overflow-x-scroll border-b border-gray-200">
        {tabs.map(({ id, icon: Icon, label }) => (
          <div>
            <Link
              key={id}
              className={cn(
                "block h-full min-w-[120px] flex-none border-black px-4 py-3 sm:min-w-[180px] sm:px-8 sm:py-6",
                "transition-all duration-100 hover:bg-gray-50 active:bg-gray-100",
                tab.id === id ? "border-b-2" : "border-b-none",
              )}
              href={
                queryParams({
                  set: {
                    tab: id,
                  },
                  getNewPath: true,
                }) as string
              }
            >
              <div className="flex items-end gap-3">
                {totalClicks || totalClicks === 0 ? (
                  <NumberTooltip value={totalClicks}>
                    <CountingNumbers
                      as="h1"
                      className="text-3xl font-bold sm:text-4xl"
                    >
                      {totalClicks}
                    </CountingNumbers>
                  </NumberTooltip>
                ) : requiresUpgrade ? (
                  <div className="rounded-full bg-gray-100 p-3">
                    <Lock className="h-4 w-4 text-gray-500" />
                  </div>
                ) : (
                  <div className="h-10 w-12 animate-pulse rounded-md bg-gray-200" />
                )}
                <Icon className="mb-2 h-4 w-4 text-gray-600" />
              </div>
              <p className="mt-1 text-sm uppercase text-gray-600">{label}</p>
            </Link>
          </div>
        ))}
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
        <AnimatePresence>
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnalyticsAreaChart show={[tab.resource]} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
