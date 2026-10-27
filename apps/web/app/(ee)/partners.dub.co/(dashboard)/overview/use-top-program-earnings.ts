import { usePartnerDateRange } from "@/lib/analytics/use-partner-date-range";
import { usePartnerProfileEarningsAnalytics } from "@/lib/swr/use-partner-profile-earnings";

// shared by the earnings chart tooltip and the Top programs card, so both use one request
export function useTopProgramEarnings() {
  const { start, end, interval } = usePartnerDateRange();

  return usePartnerProfileEarningsAnalytics({
    groupBy: "programId",
    limit: 100,
    interval,
    start,
    end,
  });
}
