import { AnalyticsEndpoints } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { fetcher } from "@dub/utils";
import { useContext } from "react";
import useSWR from "swr";
import { AnalyticsContext } from ".";

export function useAnalyticsFilterOption(
  groupBy: AnalyticsEndpoints,
): ({ count?: number } & Record<string, any>) | null {
  const { baseApiPath, queryString, selectedTab, requiresUpgrade } =
    useContext(AnalyticsContext);

  const { data } = useSWR<Record<string, any>[]>(
    `${baseApiPath}?${editQueryString(queryString, {
      groupBy,
    })}`,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  return (
    data?.map((d) => ({
      ...d,
      count:
        ((d[selectedTab] ?? d["clicks"]) as number | undefined) ?? undefined,
    })) ?? null
  );
}
