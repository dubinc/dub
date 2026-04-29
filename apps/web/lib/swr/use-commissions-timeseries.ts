import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import { PartnerAnalyticsFilters } from "../analytics/types";
import useWorkspace from "./use-workspace";

export interface CommissionTimeseriesItem {
  start: string;
  earnings: number;
  count: number;
}

export default function useCommissionsTimeseries(
  params?: PartnerAnalyticsFilters & {
    enabled: boolean;
    queryString?: string;
  },
) {
  const { id: workspaceId } = useWorkspace();

  const url = (() => {
    if (!params?.enabled) return null;

    if (params.queryString !== undefined) {
      return params.queryString
        ? `/api/commissions/timeseries?${params.queryString}`
        : null;
    }

    if (!workspaceId) return null;

    const searchParams = new URLSearchParams({
      ...(params.start && params.end
        ? {
            start: params.start.toISOString(),
            end: params.end.toISOString(),
          }
        : { interval: params.interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      workspaceId,
    });

    return `/api/commissions/timeseries?${searchParams.toString()}`;
  })();

  const { data, error } = useSWR<CommissionTimeseriesItem[]>(url, fetcher);

  return {
    data,
    error,
    loading: url !== null && !data && !error,
  };
}
