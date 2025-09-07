import { fetcher } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import {
  DUB_PARTNERS_ANALYTICS_INTERVAL,
  VALID_ANALYTICS_FILTERS,
} from "../analytics/constants";
import { PartnerAnalyticsFilters } from "../analytics/types";

export default function usePartnerAnalytics(
  params: PartnerAnalyticsFilters & {
    programId?: string;
    enabled?: boolean;
  },
  options?: SWRConfiguration,
) {
  const { programSlug } = useParams();
  const searchParams = useSearchParams();

  const programIdToUse = params?.programId ?? programSlug;

  const { data, error } = useSWR<any>(
    programIdToUse &&
      params.enabled !== false &&
      `/api/partner-profile/programs/${programIdToUse}/analytics?${new URLSearchParams(
        {
          event: params?.event ?? "composite",
          groupBy: params?.groupBy ?? "count",
          ...(params?.linkId && { linkId: params.linkId }),
          ...VALID_ANALYTICS_FILTERS.reduce(
            (acc, filter) => ({
              ...acc,
              ...(searchParams?.get(filter) && {
                [filter]: searchParams.get(filter),
              }),
            }),
            {},
          ),
          ...(params?.start && params?.end
            ? {
                start: params.start.toISOString(),
                end: params.end.toISOString(),
              }
            : {
                interval: params?.interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL,
              }),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      ).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
      ...options,
    },
  );

  return {
    data,
    error,
    loading:
      programIdToUse && params.enabled !== false && !data && !error
        ? true
        : false,
  };
}
