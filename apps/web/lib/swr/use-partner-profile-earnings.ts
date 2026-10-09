import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import useSWR from "swr";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import { IntervalOptions } from "../analytics/types";
import {
  PartnerProfileEarningsAnalyticsByGroup,
  PartnerProfileEarningsAnalyticsGroupBy,
  PartnerProfileEarningsResponse,
} from "../types";

type DateRange = {
  interval?: IntervalOptions;
  start?: Date;
  end?: Date;
};

// GET /api/partner-profile/earnings
export function usePartnerProfileEarnings({
  pageSize,
  ...dateRange
}: DateRange & { pageSize: number }) {
  return usePartnerProfileEarningsSWR<PartnerProfileEarningsResponse[]>(
    "",
    { pageSize: String(pageSize) },
    dateRange,
  );
}

type PartnerProfileEarningsTimeseries = {
  start: string;
  earnings: number;
  groupBy?: string;
  data?: Record<string, number>;
}[];

// GET /api/partner-profile/earnings/timeseries
export function usePartnerProfileEarningsTimeseries({
  groupBy,
  ...dateRange
}: DateRange & { groupBy?: "type" | "linkId" | "programId" }) {
  return usePartnerProfileEarningsSWR<PartnerProfileEarningsTimeseries>(
    "/timeseries",
    { ...(groupBy && { groupBy }) },
    dateRange,
  );
}

// the activity chart of one program: its earnings in the last year, from one
// request for all programs (SWR dedupes it across the cards and table rows)
export function usePartnerProgramActivity(programId: string) {
  const { data: timeseries } = usePartnerProfileEarningsTimeseries({
    groupBy: "programId",
    interval: "1y",
  });

  return useMemo(
    () =>
      timeseries?.map(({ start, data }) => ({
        date: new Date(start),
        value: data?.[programId] ?? 0,
      })),
    [timeseries, programId],
  );
}

// GET /api/partner-profile/earnings/analytics
export function usePartnerProfileEarningsAnalytics<
  G extends PartnerProfileEarningsAnalyticsGroupBy,
>({
  groupBy,
  limit,
  ...dateRange
}: DateRange & { groupBy: G; limit?: number }) {
  return usePartnerProfileEarningsSWR<
    PartnerProfileEarningsAnalyticsByGroup[G]
  >(
    "/analytics",
    {
      groupBy,
      ...(limit !== undefined && { limit: String(limit) }),
    },
    dateRange,
  );
}

function usePartnerProfileEarningsSWR<T>(
  path: string,
  params: Record<string, string>,
  { interval, start, end }: DateRange,
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data, error } = useSWR<T>(
    partnerId &&
      `/api/partner-profile/earnings${path}?${new URLSearchParams({
        ...params,
        ...(start && end
          ? { start: start.toISOString(), end: end.toISOString() }
          : { interval: interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return { data, error };
}
