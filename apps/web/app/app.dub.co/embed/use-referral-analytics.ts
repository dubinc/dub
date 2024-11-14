import { PartnerAnalyticsFilters } from "@/lib/analytics/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export default function useReferralAnalytics(params?: PartnerAnalyticsFilters) {
  const searchParams = new URLSearchParams({
    event: params?.event ?? "composite",
    ...(params?.start && params?.end
      ? {
          start: params.start.toISOString(),
          end: params.end.toISOString(),
        }
      : { interval: params?.interval ?? "all_unfiltered" }),
    groupBy: params?.groupBy ?? "count",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const { data, error, isLoading } = useSWR<any>(
    `/api/analytics/client?${searchParams.toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    error,
    isLoading,
  };
}
