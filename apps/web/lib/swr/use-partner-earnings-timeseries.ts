import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import { PartnerEarningsTimeseriesFilters } from "../analytics/types";

export function usePartnerEarningsTimeseries(
  params?: PartnerEarningsTimeseriesFilters & { programId?: string },
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];
  const { programSlug } = useParams();
  const programIdToUse = params?.programId ?? programSlug;

  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<any>(
    partnerId &&
      programIdToUse &&
      `/api/partner-profile/programs/${programIdToUse}/earnings/timeseries${getQueryString(
        {
          ...(params?.groupBy && { groupBy: params.groupBy }),
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
        { include: ["type", "linkId", "customerId", "status"] },
      )}`,
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
