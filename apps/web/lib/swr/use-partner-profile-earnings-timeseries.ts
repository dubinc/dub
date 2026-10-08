import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as z from "zod/v4";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import { partnerProfileEarningsTimeseriesQuerySchema } from "../zod/schemas/partner-profile";

export type PartnerProfileEarningsTimeseries = {
  start: string;
  earnings: number;
  groupBy?: string;
  data?: Record<string, number>;
}[];

export function usePartnerProfileEarningsTimeseries({
  groupBy,
  programIdOrSlug,
  interval,
  start,
  end,
  enabled = true,
}: Pick<
  z.input<typeof partnerProfileEarningsTimeseriesQuerySchema>,
  "groupBy" | "programIdOrSlug" | "interval"
> & {
  start?: Date;
  end?: Date;
  enabled?: boolean;
}) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data, error } = useSWR<PartnerProfileEarningsTimeseries>(
    enabled &&
      partnerId &&
      `/api/partner-profile/earnings/timeseries?${new URLSearchParams({
        ...(groupBy && { groupBy }),
        ...(programIdOrSlug && { programIdOrSlug }),
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

  return {
    data,
    error,
    loading: !data && !error,
  };
}
