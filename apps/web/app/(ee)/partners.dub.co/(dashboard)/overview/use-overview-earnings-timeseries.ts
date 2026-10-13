import { usePartnerProfileEarningsTimeseries } from "@/lib/swr/use-partner-profile-earnings";
import { useMemo } from "react";
import { useOverviewDateRange } from "./use-overview-date-range";

// shared by the earnings chart and the Top programs card, so both use one request and the same total
export function useOverviewEarningsTimeseries() {
  const { start, end, interval } = useOverviewDateRange();

  const { data, error } = usePartnerProfileEarningsTimeseries({
    groupBy: "programId",
    interval,
    start,
    end,
  });

  const total = useMemo(
    () => data?.reduce((acc, { earnings }) => acc + earnings, 0),
    [data],
  );

  return { data, error, total };
}
