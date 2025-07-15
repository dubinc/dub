import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import { EServerRoutes } from "../../../interfaces/routes.interface.ts";
import {
  createUserPaymentFetcher,
  createUserSessionFetcher,
  updateUserSessionFetcher,
} from "./payment.fetcher";

// hook
export const useCreateUserSessionMutation = () => {
  return useSWRMutation(EServerRoutes.USER_SESSION, createUserSessionFetcher, {
    onSuccess(res) {
      if (!res.success) {
        toast.error(res?.error || "");
      }
    },
  });
};

export const useUpdateUserSessionMutation = () => {
  return useSWRMutation(EServerRoutes.USER_SESSION, updateUserSessionFetcher, {
    onSuccess(res) {
      if (!res.success) {
        toast.error(res?.error || "");
      }
    },
  });
};

export const useCreateUserPaymentMutation = () => {
  return useSWRMutation(EServerRoutes.USER_PAYMENT, createUserPaymentFetcher, {
    onSuccess(res) {
      if (!res.success) {
        toast.error(res?.error || "");
      }
    },
  });
};
