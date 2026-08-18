import { useSession } from "@/lib/better-auth/use-session";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { PayoutsCount } from "../types";

export default function usePartnerPayoutsCount(
  query?: Record<string, string>,
  {
    includeParams = ["programId"],
  }: {
    includeParams?: string[];
  } = {},
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];
  const { getQueryString } = useRouterStuff();

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    partnerId &&
      `/api/partner-profile/payouts/count${getQueryString(query, {
        include: includeParams,
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    payoutsCount,
    error,
    loading: !payoutsCount && !error,
  };
}
