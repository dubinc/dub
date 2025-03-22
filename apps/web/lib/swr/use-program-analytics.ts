import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import { PartnerAnalyticsFilters } from "../analytics/types";
import useWorkspace from "./use-workspace";

export default function useProgramRevenue(params?: PartnerAnalyticsFilters) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<any>(
    `/api/programs/${programId}/revenue?${new URLSearchParams({
      event: params?.event ?? "composite",
      ...(params?.start && params?.end
        ? {
            start: params.start.toISOString(),
            end: params.end.toISOString(),
          }
        : { interval: params?.interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL }),
      groupBy: params?.groupBy ?? "count",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      workspaceId: workspaceId!,
    }).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    error,
    loading: programId && !data && !error ? true : false,
  };
}
