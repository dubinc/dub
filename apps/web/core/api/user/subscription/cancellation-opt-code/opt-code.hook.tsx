import { EServerRoutes } from "core/interfaces/routes.interface";
import useSWRMutation from "swr/mutation";
import { sendOtpCodeFetcher, verifyOtpCodeFetcher } from "./opt-code.fetcher";

// hook
export const useVerifyOtpCodeQuery = () => {
  return useSWRMutation(EServerRoutes.OTP_CODE_VERIFY, verifyOtpCodeFetcher);
};

export const useSendOtpCodeQuery = () => {
  return useSWRMutation(EServerRoutes.OTP_CODE_SEND, sendOtpCodeFetcher);
};
