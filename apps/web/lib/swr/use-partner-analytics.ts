import { fetcher } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { VALID_ANALYTICS_FILTERS } from "../analytics/constants";
import { PartnerAnalyticsFilters } from "../analytics/types";
import useProgramEnrollment from "./use-program-enrollment";

export default function usePartnerAnalytics(
  params?: PartnerAnalyticsFilters & { programId?: string },
) {
  const { partnerId } = useParams();
  const searchParams = useSearchParams();
  const { programEnrollment } = useProgramEnrollment();

  const programIdToUse = params?.programId || programEnrollment?.programId;

  const { data, error } = useSWR<any>(
    programIdToUse
      ? `/api/partners/${partnerId}/programs/${programIdToUse}/analytics?${new URLSearchParams(
          {
            event: params?.event ?? "composite",
            groupBy: params?.groupBy ?? "count",
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
              : { interval: params?.interval ?? "all_unfiltered" }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        ).toString()}`
      : undefined,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    data,
    error,
    loading: partnerId && programIdToUse && !data && !error ? true : false,
  };
}
