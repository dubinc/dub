import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerAnalyticsFilters } from "../analytics/types";

export default function usePartnerAnalytics(params?: PartnerAnalyticsFilters) {
  const { partnerId, programId } = useParams();

  const { data, error } = useSWR<any>(
    `/api/partners/${partnerId}/programs/${programId}/analytics?${new URLSearchParams(
      {
        event: params?.event ?? "composite",
        interval: params?.interval ?? "all_unfiltered",
        ...(params?.start &&
          params?.end && {
            start: params.start.toISOString(),
            end: params.end.toISOString(),
          }),
        groupBy: params?.groupBy ?? "count",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    ).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    error,
    loading: partnerId && programId && !data && !error ? true : false,
  };
}
