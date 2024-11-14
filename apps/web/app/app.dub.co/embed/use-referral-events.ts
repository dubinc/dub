import { PartnerEventsFilters } from "@/lib/analytics/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export default function useReferralEvents(params?: PartnerEventsFilters) {
  const searchParams = new URLSearchParams({
    event: params?.event ?? "sales",
    ...(params?.start && params?.end
      ? {
          start: params.start.toISOString(),
          end: params.end.toISOString(),
        }
      : { interval: params?.interval ?? "30d" }),
  });

  const { data, error } = useSWR<any>(
    `/api/events/client?${searchParams.toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    error,
    loading: !data && !error,
  };
}
