import { EServerRoutes } from "core/interfaces/routes.interface.ts";
import { toast } from "sonner";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  checkSubscriptionStatusFetcher,
  createSubscriptionFetcher,
  updateSubscriptionFetcher,
  updateSubscriptionPaymentMethod,
} from "./subscription.fetcher";

// hook
export const useCreateSubscriptionMutation = () => {
  return useSWRMutation(
    EServerRoutes.USER_SUBSCRIPTION,
    createSubscriptionFetcher,
    {
      onSuccess(res) {
        if (!res.success) {
          toast.error(res?.error || "");
        }
      },
    },
  );
};

export const useUpdateSubscriptionMutation = () => {
  return useSWRMutation(
    EServerRoutes.USER_SUBSCRIPTION_UPDATE,
    updateSubscriptionFetcher,
    {
      onSuccess(res) {
        if (!res.success) {
          toast.error(res?.error || "");
        }
      },
    },
  );
};

export const useCheckSubscriptionStatusQuery = () => {
  return useSWR(
    EServerRoutes.USER_SUBSCRIPTION_STATUS,
    checkSubscriptionStatusFetcher,
    {
      onSuccess(res) {
        if (!res.success) {
          toast.error(res?.error || "");
        }
      },
    },
  );
};

export const useUpdateSubscriptionPaymentMethodQuery = () => {
  return useSWRMutation(
    EServerRoutes.USER_SUBSCRIPTION_PAYMENT_METHOD_UPDATE,
    updateSubscriptionPaymentMethod,
    {
      onSuccess(res) {
        if (!res.success) {
          toast.error(res?.error || "");
        }
      },
    },
  );
};
