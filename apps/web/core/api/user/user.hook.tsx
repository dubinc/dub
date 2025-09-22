import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  getUserProfileFetcher,
  updateUserProfileFetcher,
} from "./user.fetcher";

import { ICustomerBody } from "core/integration/payment/config";
import { EServerRoutes } from "core/interfaces/routes.interface.ts";
import { isCookieEnabled } from "core/services/cookie/cookie.service.ts";
import { getCurrenciesData } from "core/services/currencies.service.ts";
import { toast } from "sonner";

// hook
export const useGetUserProfileQuery = () => {
  const { trigger } = useUpdateUserMutation();

  return useSWR(
    !isCookieEnabled() ? "" : EServerRoutes.USER,
    getUserProfileFetcher,
    {
      async onSuccess(res) {
        if (!res.success) {
          toast.error(res?.error || "");
        } else {
          if (
            !res?.data?.currency?.countryCode &&
            process.env.NEXT_PUBLIC_CURRENCY_URL
          ) {
            const currencies = await getCurrenciesData();

            await trigger({
              currency: {
                ...currencies,
              },
              trialPlan: "PRICE_TRIAL_MONTH_PLAN",
            } as Partial<ICustomerBody>);
          }
        }
      },
    },
  );
};

export const useUpdateUserMutation = () => {
  return useSWRMutation(EServerRoutes.USER, updateUserProfileFetcher, {
    async onSuccess(res) {
      if (!res.success) {
        toast.error(res?.error || "");
      }
    },
  });
};
