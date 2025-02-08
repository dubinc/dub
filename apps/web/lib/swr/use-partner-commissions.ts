import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { VALID_ANALYTICS_FILTERS } from "../analytics/constants";
import { PartnerAnalyticsFilters } from "../analytics/types";

export default function usePartnerAnalytics(
  params?: PartnerAnalyticsFilters & { programId?: string },
) {
  const { data: session } = useSession();
  const { programSlug } = useParams();
  const searchParams = useSearchParams();

  const partnerId = session?.user?.["defaultPartnerId"];
  const programIdToUse = params?.programId ?? programSlug;

  const { data, error } = useSWR<any>(
    partnerId &&
      programIdToUse &&
      `/api/partner-profile/programs/${programIdToUse}/analytics?${new URLSearchParams(
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
            : { interval: params?.interval ?? "1y" }),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      ).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    loading: partnerId && programIdToUse && !data && !error ? true : false,
  };
}

export function usePartnerCommissions(
  params?: PartnerAnalyticsFilters & { programId?: string },
) {
  const { data: session } = useSession();
  const { programSlug } = useParams();
  const searchParams = useSearchParams();

  const partnerId = session?.user?.["defaultPartnerId"];
  const programIdToUse = params?.programId ?? programSlug;

  const { data, error } = useSWR<any>(
    partnerId &&
      programIdToUse &&
      `/api/partner-profile/programs/${programIdToUse}/commissions/timeseries?${new URLSearchParams(
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
            : { interval: params?.interval ?? "1y" }),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      ).toString()}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    loading: partnerId && programIdToUse && !data && !error ? true : false,
  };
}
