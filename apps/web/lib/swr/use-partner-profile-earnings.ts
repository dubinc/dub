import { fetcher } from "@dub/utils";
import { CommissionStatus, CommissionType } from "@prisma/client";
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

// without programIdOrSlug, the routes return the earnings of all programs
export type PartnerProfileEarningsFilters = {
  programIdOrSlug?: string;
  type?: CommissionType;
  linkId?: string;
  customerId?: string;
  status?: CommissionStatus;
  payoutId?: string;
};

type PartnerProfileEarningsQuery = DateRange &
  PartnerProfileEarningsFilters & {
    enabled?: boolean;
  };

// GET /api/partner-profile/earnings
export function usePartnerProfileEarnings({
  pageSize,
  page,
  sortBy,
  sortOrder,
  ...query
}: PartnerProfileEarningsQuery & {
  pageSize: number;
  page?: number;
  sortBy?: "createdAt" | "amount" | "earnings";
  sortOrder?: "asc" | "desc";
}) {
  return usePartnerProfileEarningsSWR<PartnerProfileEarningsResponse[]>(
    "",
    {
      pageSize: String(pageSize),
      ...(page !== undefined && { page: String(page) }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder }),
    },
    query,
  );
}

// GET /api/partner-profile/earnings/count
export function usePartnerProfileEarningsCount<T = { count: number }>({
  groupBy,
  ...query
}: PartnerProfileEarningsQuery & {
  groupBy?: "linkId" | "customerId" | "status" | "type";
}) {
  return usePartnerProfileEarningsSWR<T>(
    "/count",
    { ...(groupBy && { groupBy }) },
    query,
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
  ...query
}: PartnerProfileEarningsQuery & {
  groupBy?: "type" | "linkId" | "programId";
}) {
  return usePartnerProfileEarningsSWR<PartnerProfileEarningsTimeseries>(
    "/timeseries",
    { ...(groupBy && { groupBy }) },
    query,
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
  {
    interval,
    start,
    end,
    enabled = true,
    ...filters
  }: PartnerProfileEarningsQuery,
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data, error, isLoading } = useSWR<T>(
    enabled &&
      partnerId &&
      `/api/partner-profile/earnings${path}?${new URLSearchParams({
        ...params,
        ...Object.fromEntries(
          Object.entries(filters).filter(
            (entry): entry is [string, string] => !!entry[1],
          ),
        ),
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

  return { data, error, isLoading };
}
