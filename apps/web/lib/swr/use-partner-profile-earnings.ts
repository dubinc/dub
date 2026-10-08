import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import { IntervalOptions } from "../analytics/types";
import {
  PartnerProfileEarningsResponse,
  PartnerProfileTopLinkEarnings,
  PartnerProfileTopProgramEarnings,
} from "../types";

type DateRange = {
  interval?: IntervalOptions;
  start?: Date;
  end?: Date;
};

type PartnerProfileEarningsTimeseries = {
  start: string;
  earnings: number;
  groupBy?: string;
  data?: Record<string, number>;
}[];

type TopEarningsByGroup = {
  programId: PartnerProfileTopProgramEarnings;
  linkId: PartnerProfileTopLinkEarnings;
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

// GET /api/partner-profile/earnings/top
export function usePartnerProfileTopEarnings<
  T extends keyof TopEarningsByGroup,
>({ groupBy, limit, ...dateRange }: DateRange & { groupBy: T; limit: number }) {
  return usePartnerProfileEarningsSWR<TopEarningsByGroup[T][]>(
    "/top",
    { groupBy, limit: String(limit) },
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
