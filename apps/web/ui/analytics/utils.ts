import { AnalyticsGroupByOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { fetcher } from "@dub/utils";
import { useContext } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AnalyticsContext } from "./analytics-provider";

type AnalyticsFilterResult = {
  data: ({ count?: number } & Record<string, any>)[] | null;
  loading: boolean;
  path?:string;
};

/**
 * Fetches event counts grouped by the specified filter
 *
 * @param groupByOrParams Either a groupBy option or a query parameter object including groupBy
 * @param options Additional options
 */
export function useAnalyticsFilterOption(
  groupByOrParams:
    | AnalyticsGroupByOptions
    | ({ groupBy: AnalyticsGroupByOptions } & Record<string, any>),
  options?: { cacheOnly?: boolean, filterKey?: string },
): AnalyticsFilterResult {
  const { cache } = useSWRConfig();
  const { baseApiPath, queryString, selectedTab, requiresUpgrade } =
    useContext(AnalyticsContext);

  const params = new URLSearchParams(editQueryString(queryString, {
    ...(typeof groupByOrParams === "string"
      ? { groupBy: groupByOrParams }
      : groupByOrParams),
  }));
  
  if (options?.filterKey) {
    params.delete(options.filterKey);
  }

  const cachePath = `${baseApiPath}?${params.toString()}`;

  const enabled = !options?.cacheOnly || [...cache.keys()].includes(cachePath);

  const { data, isLoading } = useSWR<Record<string, any>[]>(
  enabled ? cachePath : null,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  return {
    data:
      data?.map((d) => ({
        ...d,
        count: d[selectedTab] as number | undefined,
        saleAmount: d.saleAmount as number | undefined,
      })) ?? null,
    loading: !data || isLoading,
  };
}
