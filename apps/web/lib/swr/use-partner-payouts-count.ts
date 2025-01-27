import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PayoutsCount } from "../types";

export default function usePartnerPayoutsCount() {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    partnerId && `/api/partner-profile/payouts/count`,
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
