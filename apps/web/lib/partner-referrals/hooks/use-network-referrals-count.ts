import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { getNetworkReferralsCountQuerySchema } from "../schemas";

export function useNetworkReferralsCount<T = number>({
  query,
  includeParams = ["country"],
  enabled = true,
}: {
  query?: z.infer<typeof getNetworkReferralsCountQuerySchema>;
  includeParams?: string[];
  enabled?: boolean;
} = {}) {
  const { getQueryString } = useRouterStuff();

  const { data, error } = useSWR<T>(
    enabled &&
      `/api/partner-profile/referrals/count${getQueryString(query, {
        include: includeParams,
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
  };
}
