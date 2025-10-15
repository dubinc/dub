import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PayoutsCount } from "../types";

export default function usePartnerPayoutsCount<T>(
  opts?: Record<string, string>,
) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];
  const { getQueryString } = useRouterStuff();

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    partnerId &&
      `/api/partner-profile/payouts/count${getQueryString(opts, {
        include: ["programId"],
      })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    payoutsCount: payoutsCount as T,
    error,
    loading: !payoutsCount && !error,
  };
}
