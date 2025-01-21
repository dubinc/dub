import { AnalyticsGroupByOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { fetcher } from "@dub/utils";
import { useContext } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AnalyticsContext } from "./analytics-provider";

type AnalyticsFilterResult = {
  data: ({ count?: number } & Record<string, any>)[] | null;
  loading: boolean;
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
  options?: { cacheOnly?: boolean },
): AnalyticsFilterResult {
  const { cache } = useSWRConfig();

  const { baseApiPath, queryString, selectedTab, requiresUpgrade } =
    useContext(AnalyticsContext);

  const enabled =
    !options?.cacheOnly ||
    [...cache.keys()].includes(
      `${baseApiPath}?${editQueryString(queryString, {
        ...(typeof groupByOrParams === "string"
          ? { groupBy: groupByOrParams }
          : groupByOrParams),
      })}`,
    );

  const { data, isLoading } = useSWR<Record<string, any>[]>(
    enabled
      ? `${baseApiPath}?${editQueryString(queryString, {
          ...(typeof groupByOrParams === "string"
            ? { groupBy: groupByOrParams }
            : groupByOrParams),
        })}`
      : null,
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
