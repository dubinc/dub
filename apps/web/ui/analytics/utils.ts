import { SINGULAR_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { AnalyticsGroupByOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { fetcher } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import { ContextType, useContext } from "react";
import useSWR from "swr";
import { AnalyticsContext } from "./analytics-provider";

type AnalyticsFilterResult = {
  data:
    | ({ count?: number; saleAmount?: number } & Record<string, any>)[]
    | null;
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
  options?: {
    disabled?: boolean;
    omitGroupByFilterKey?: boolean; // for Filter.Select and Filter.List, we need to show all options by default, so we need to omit the groupBy filter key
    context?: Pick<
      ContextType<typeof AnalyticsContext>,
      "baseApiPath" | "queryString" | "selectedTab" | "requiresUpgrade"
    >;
  },
): AnalyticsFilterResult {
  const searchParams = useSearchParams();

  const { baseApiPath, queryString, selectedTab, requiresUpgrade } =
    options?.context ?? useContext(AnalyticsContext);

  const groupBy =
    typeof groupByOrParams === "string"
      ? groupByOrParams
      : groupByOrParams?.groupBy;

  const { data, isLoading } = useSWR<Record<string, any>[]>(
    !options?.disabled &&
      `${baseApiPath}?${editQueryString(
        queryString,
        {
          ...(groupBy && { groupBy }),
          ...(!options?.omitGroupByFilterKey &&
            groupBy === "top_links" &&
            !searchParams.get("root") && { root: "false" }),
        },
        // if theres no groupBy or we're not omitting the groupBy filter, skip
        // else, we need to remove the filter for that groupBy param
        (() => {
          if (!groupBy || !options?.omitGroupByFilterKey) return undefined;
          if (groupBy === "top_links") return ["domain", "key"];
          return SINGULAR_ANALYTICS_ENDPOINTS[groupBy]
            ? SINGULAR_ANALYTICS_ENDPOINTS[groupBy]
            : undefined;
        })(),
      )}`,
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
