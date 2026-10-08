import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as z from "zod/v4";
import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "../analytics/constants";
import {
  PartnerProfileTopLinkEarnings,
  PartnerProfileTopProgramEarnings,
} from "../types";
import { partnerProfileTopEarningsQuerySchema } from "../zod/schemas/partner-profile";

type TopEarningsByGroup = {
  programId: PartnerProfileTopProgramEarnings;
  linkId: PartnerProfileTopLinkEarnings;
};

export function usePartnerProfileTopEarnings<
  T extends keyof TopEarningsByGroup,
>({
  groupBy,
  limit,
  programIdOrSlug,
  interval,
  start,
  end,
}: { groupBy: T } & Pick<
  z.input<typeof partnerProfileTopEarningsQuerySchema>,
  "limit" | "programIdOrSlug" | "interval"
> & {
    start?: Date;
    end?: Date;
  }) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data, error } = useSWR<TopEarningsByGroup[T][]>(
    partnerId &&
      `/api/partner-profile/earnings/top?${new URLSearchParams({
        groupBy,
        ...(limit !== undefined && { limit: String(limit) }),
        ...(programIdOrSlug && { programIdOrSlug }),
        ...(start && end
          ? { start: start.toISOString(), end: end.toISOString() }
          : { interval: interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    loading: !data && !error,
  };
}
