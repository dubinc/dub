import { usePartnerProfileEarningsAnalytics } from "@/lib/swr/use-partner-profile-earnings";
import { useOverviewDateRange } from "./use-overview-date-range";

// shared by the earnings chart tooltip and the Top programs card, so both use one request
export function useTopProgramEarnings() {
  const { start, end, interval } = useOverviewDateRange();

  return usePartnerProfileEarningsAnalytics({
    groupBy: "programId",
    limit: 100,
    interval,
    start,
    end,
  });
}
