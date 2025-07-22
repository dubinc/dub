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
        console.log("[useCreateUserSessionMutation] response", res);
        console.log(
          "[useCreateUserSessionMutation] response error",
          res?.error,
        );
        toast.error(res?.error || "");
      }
    },
  });
};

export const useUpdateUserSessionMutation = () => {
  return useSWRMutation(EServerRoutes.USER_SESSION, updateUserSessionFetcher, {
    onSuccess(res) {
      if (!res.success) {
        console.log("[useUpdateUserSessionMutation] response", res);
        console.log(
          "[useUpdateUserSessionMutation] response error",
          res?.error,
        );
        toast.error(res?.error || "");
      }
    },
  });
};

export const useCreateUserPaymentMutation = () => {
  return useSWRMutation(EServerRoutes.USER_PAYMENT, createUserPaymentFetcher, {
    onSuccess(res) {
      if (!res.success) {
        console.log("[useCreateUserPaymentMutation] response", res);
        console.log(
          "[useCreateUserPaymentMutation] response error",
          res?.error,
        );
        toast.error(res?.error || "");
      }
    },
  });
};
