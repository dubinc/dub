import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { hasPermission } from "../auth/partner-user-permissions";
import { PayoutsCount } from "../types";
import usePartnerProfile from "./use-partner-profile";

export default function usePartnerPayoutsCount<T>(
  opts?: Record<string, string>,
) {
  const { partner } = usePartnerProfile();

  const { getQueryString } = useRouterStuff();

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    partner &&
      partner.id &&
      hasPermission(partner.role, "payouts.read") &&
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
