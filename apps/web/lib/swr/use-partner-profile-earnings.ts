import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as z from "zod/v4";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import { PartnerProfileEarningsResponse } from "../types";
import { partnerProfileEarningsQuerySchema } from "../zod/schemas/partner-profile";

export function usePartnerProfileEarnings({
  pageSize,
  programIdOrSlug,
  interval,
  start,
  end,
}: Pick<
  z.input<typeof partnerProfileEarningsQuerySchema>,
  "pageSize" | "programIdOrSlug" | "interval"
> & {
  start?: Date;
  end?: Date;
}) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data, error } = useSWR<PartnerProfileEarningsResponse[]>(
    partnerId &&
      `/api/partner-profile/earnings?${new URLSearchParams({
        ...(pageSize !== undefined && { pageSize: String(pageSize) }),
        ...(programIdOrSlug && { programIdOrSlug }),
        ...(start && end
          ? { start: start.toISOString(), end: end.toISOString() }
          : { interval: interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    loading: !data && !error,
  };
}
