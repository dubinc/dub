import type { PartnerPayoutMethodSetting } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";

export default function usePartnerPayoutSettings() {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const {
    data: payoutMethods = [],
    error,
    isLoading,
    mutate,
  } = useSWR<PartnerPayoutMethodSetting[]>(
    partnerId ? "/api/partner-profile/payouts/settings" : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    payoutMethods,
    error,
    isLoading,
    mutate,
  };
}
