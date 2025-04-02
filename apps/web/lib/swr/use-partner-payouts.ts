import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PartnerPayoutResponse } from "../types";

export default function usePartnerPayouts(opts?: Record<string, string>) {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];
  const { getQueryString } = useRouterStuff();

  const { data: payouts, error } = useSWR<PartnerPayoutResponse[]>(
    partnerId
      ? `/api/partner-profile/payouts${getQueryString(opts, {
          include: ["programId", "sortBy", "sortOrder"],
        })}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    payouts,
    error,
    loading: !payouts && !error,
  };
}
