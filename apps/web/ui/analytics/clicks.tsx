import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics";
import useTags from "@/lib/swr/use-tags";
import { Chart } from "@/ui/shared/icons";
import { CountingNumbers, NumberTooltip, useRouterStuff } from "@dub/ui";
import { COUNTRIES, capitalize, linkConstructor, truncate } from "@dub/utils";
import { X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { AnalyticsContext } from ".";
import ClicksChart from "./clicks-chart";
import useDomains from "@/lib/swr/use-domains";

export default function Clicks() {
  const { totalClicks } = useContext(AnalyticsContext);
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");
  const key = searchParams?.get("key");
  const { queryParams } = useRouterStuff();

  // Tag related
  const tagId = searchParams?.get("tagId");
  const { tags } = useTags();

  // Domain related
  const domainSlug = searchParams?.get("domainSlug");
  const { allActiveDomains: domains } = useDomains();

  return (
    <div className="max-w-4xl overflow-hidden border border-gray-200 bg-white p-5 sm:rounded-lg sm:border-gray-100 sm:p-10 sm:shadow-lg">
      <div className="mb-5 flex items-start justify-between space-x-4">
        <div className="flex-none">
          <div className="flex items-end space-x-1">
            {totalClicks || totalClicks === 0 ? (
              <NumberTooltip value={totalClicks}>
                <CountingNumbers
                  as="h1"
                  className="text-3xl font-bold sm:text-4xl"
                >
                  {totalClicks}
                </CountingNumbers>
              </NumberTooltip>
            ) : (
              <div className="h-10 w-12 animate-pulse rounded-md bg-gray-200" />
            )}
            <Chart className="mb-1 h-6 w-6 text-gray-600" />
          </div>
          <p className="text-sm font-medium uppercase text-gray-600">
            Total Clicks
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
          {VALID_ANALYTICS_FILTERS.map((filter) => {
            if (filter === "excludeRoot" || filter === "tagId") return null;
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
      <ClicksChart />
    </div>
  );
}
