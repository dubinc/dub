import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { IntervalOptions } from "@/lib/analytics/types";
import type {
  CommissionAnalyticsByGroup,
  CommissionAnalyticsGroupBy,
} from "@/lib/commissions/schema";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export type {
  CommissionAnalyticsPartnerRow,
  CommissionCategoryRow,
  CommissionTimeseriesItem,
} from "@/lib/commissions/schema";

export default function useCommissionAnalytics<
  G extends CommissionAnalyticsGroupBy,
>({
  groupBy,
  enabled = true,
  queryString,
  interval,
  start,
  end,
}: {
  groupBy: G;
  enabled?: boolean;
  /** Dashboard filters (workspaceId, dates, status, etc.) */
  queryString?: string;
  /** When `queryString` is omitted, build URL from workspace + interval or start/end */
  interval?: IntervalOptions;
  start?: Date;
  end?: Date;
}) {
  const { id: workspaceId } = useWorkspace();

  const url = useMemo(() => {
    if (!enabled) return null;

    let qs: string | null = null;

    if (queryString !== undefined) {
      qs = queryString || null;
    } else if (workspaceId) {
      const searchParams = new URLSearchParams({
        ...(start && end
          ? {
              start: start.toISOString(),
              end: end.toISOString(),
            }
          : { interval: interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        workspaceId,
      });
      qs = searchParams.toString();
    }

    if (!qs) return null;

    return `/api/commissions/analytics?groupBy=${groupBy}&${qs}`;
  }, [enabled, queryString, workspaceId, groupBy, interval, start, end]);

  const { data, error, isLoading } = useSWR<CommissionAnalyticsByGroup[G]>(
    url,
    fetcher,
    { keepPreviousData: true },
  );

  return { data, isLoading, error };
}
